'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

// ==========================================
// 1. SETTINGS & CONSTANTS
// ==========================================

export async function getSettings() {
  const list = await prisma.setting.findMany();
  const map: Record<string, string> = {};
  list.forEach((s) => {
    map[s.key] = s.value;
  });
  return map;
}

export async function updateSetting(key: string, value: string) {
  const setting = await prisma.setting.update({
    where: { key },
    data: { value },
  });
  revalidatePath('/settings');
  revalidatePath('/lunch-packs');
  return setting;
}

// ==========================================
// 2. LUNCH CUSTOMERS & DAILY TRANSACTIONS
// ==========================================

export async function getLunchCustomers() {
  return prisma.lunchCustomer.findMany({
    orderBy: { id: 'asc' },
  });
}

export async function addLunchCustomer(data: {
  id: string;
  name?: string;
  phone?: string;
  route?: string;
  address?: string;
  mode: string;
  defaultPackType: string;
  defaultWithRice: boolean;
  monthlyPrice?: number;
}) {
  const customer = await prisma.lunchCustomer.create({
    data: {
      id: data.id,
      name: data.name || null,
      phone: data.phone || null,
      route: data.route || null,
      address: data.address || null,
      mode: data.mode,
      defaultPackType: data.defaultPackType,
      defaultWithRice: data.defaultWithRice,
      monthlyPrice: data.monthlyPrice || 0,
      active: true,
    },
  });
  revalidatePath('/lunch-packs');
  return customer;
}

export async function updateLunchCustomer(
  id: string,
  data: {
    name?: string;
    phone?: string;
    route?: string;
    address?: string;
    mode: string;
    defaultPackType: string;
    defaultWithRice: boolean;
    monthlyPrice?: number;
    active?: boolean;
  }
) {
  const customer = await prisma.lunchCustomer.update({
    where: { id },
    data: {
      name: data.name || null,
      phone: data.phone || null,
      route: data.route || null,
      address: data.address || null,
      mode: data.mode,
      defaultPackType: data.defaultPackType,
      defaultWithRice: data.defaultWithRice,
      monthlyPrice: data.monthlyPrice || 0,
      active: data.active !== undefined ? data.active : true,
    },
  });
  revalidatePath('/lunch-packs');
  return customer;
}

export async function getDailyTransactions(dateStr: string) {
  const dateObj = new Date(dateStr);
  const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  return prisma.dailyLunchTransaction.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });
}

export async function saveDailyAttendance(
  dateStr: string,
  records: Array<{
    customerId: string;
    delivered: boolean;
    packType: string;
    withRice: boolean;
    extras: any[];
    totalAmount: number;
    paymentStatus: string;
  }>
) {
  const dateObj = new Date(dateStr);
  const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  const customerIds = records.map((r) => r.customerId);

  // Clear previous daily transactions for this subset of customers on this date
  await prisma.dailyLunchTransaction.deleteMany({
    where: {
      customerId: { in: customerIds },
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const created = [];
  for (const r of records) {
    if (r.delivered) {
      const entry = await prisma.dailyLunchTransaction.create({
        data: {
          date: new Date(dateStr),
          customerId: r.customerId,
          packType: r.packType,
          withRice: r.withRice,
          extras: r.extras,
          totalAmount: r.totalAmount,
          paymentStatus: r.paymentStatus,
        },
      });

      if (r.paymentStatus === 'PAID') {
        await prisma.payment.create({
          data: {
            date: new Date(dateStr),
            amount: r.totalAmount,
            method: 'CASH',
            referenceType: 'LUNCH_PACK',
            referenceId: r.customerId,
            notes: `Instant payment for daily delivery on ${dateStr}`,
          },
        });
      }
      created.push(entry);
    }
  }

  revalidatePath('/lunch-packs');
  revalidatePath('/dashboard');
  return created;
}

export async function toggleLunchCustomerStatus(id: string, active: boolean) {
  const customer = await prisma.lunchCustomer.update({
    where: { id },
    data: { active },
  });
  revalidatePath('/lunch-packs');
  return customer;
}

export async function recordLunchTransaction(data: {
  customerId: string;
  packType: string;
  withRice: boolean;
  extras: any[]; // [{ name: string, price: number, quantity: number }]
  totalAmount: number;
  date: string;
  paymentStatus: string;
}) {
  const transaction = await prisma.dailyLunchTransaction.create({
    data: {
      date: new Date(data.date),
      customerId: data.customerId,
      packType: data.packType,
      withRice: data.withRice,
      extras: data.extras,
      totalAmount: data.totalAmount,
      paymentStatus: data.paymentStatus,
    },
  });

  // If paid immediately, create a Payment log
  if (data.paymentStatus === 'PAID') {
    await prisma.payment.create({
      data: {
        date: new Date(data.date),
        amount: data.totalAmount,
        method: 'CASH', // default
        referenceType: 'LUNCH_PACK',
        referenceId: data.customerId,
        notes: `Instant payment for daily transaction on ${data.date}`,
      },
    });
  }

  revalidatePath('/lunch-packs');
  revalidatePath('/dashboard');
  return transaction;
}

export async function getCustomerTransactions(customerId: string, startDate?: Date, endDate?: Date) {
  const whereClause: any = { customerId };
  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = startDate;
    if (endDate) whereClause.date.lte = endDate;
  }

  return prisma.dailyLunchTransaction.findMany({
    where: whereClause,
    orderBy: { date: 'desc' },
  });
}

export async function generateMonthlyInvoice(customerId: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const customer = await prisma.lunchCustomer.findUnique({
    where: { id: customerId },
  });

  if (!customer) throw new Error('Customer not found');

  const transactions = await prisma.dailyLunchTransaction.findMany({
    where: {
      customerId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  let totalAmount = 0;
  if (customer.mode === 'MONTHLY') {
    totalAmount = (customer.monthlyPrice || 0) + transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  } else {
    totalAmount = transactions.reduce((acc, t) => acc + t.totalAmount, 0);
  }

  // Get total payments made by customer in this month
  const payments = await prisma.payment.findMany({
    where: {
      referenceType: 'LUNCH_PACK',
      referenceId: customerId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const balance = totalAmount - totalPaid;

  return {
    customer,
    transactions,
    totalAmount,
    totalPaid,
    balance,
    year,
    month,
    startDate,
    endDate,
  };
}

export async function recordLunchPayment(customerId: string, amount: number, method: string, notes?: string) {
  const payment = await prisma.payment.create({
    data: {
      date: new Date(),
      amount,
      method,
      referenceType: 'LUNCH_PACK',
      referenceId: customerId,
      notes: notes || `Monthly lunch pack payment`,
    },
  });

  // Automatically update pending transactions to PAID as far as the payment covers them
  const pendingTransactions = await prisma.dailyLunchTransaction.findMany({
    where: {
      customerId,
      paymentStatus: 'PENDING',
    },
    orderBy: { date: 'asc' },
  });

  let remainingPayment = amount;
  for (const t of pendingTransactions) {
    if (remainingPayment >= t.totalAmount) {
      await prisma.dailyLunchTransaction.update({
        where: { id: t.id },
        data: { paymentStatus: 'PAID' },
      });
      remainingPayment -= t.totalAmount;
    } else {
      break;
    }
  }

  revalidatePath('/lunch-packs');
  revalidatePath('/dashboard');
  return payment;
}

// ==========================================
// 3. BULK ORDERS
// ==========================================

export async function getBulkOrders() {
  return prisma.bulkOrder.findMany({
    orderBy: { date: 'desc' },
  });
}

export async function createBulkOrder(data: {
  customerName: string;
  contactNumber: string;
  date: string;
  packType: string;
  withRice: boolean;
  quantity: number;
  extras: any[];
  totalAmount: number;
  advancePaid: number;
  status: string;
}) {
  const balanceAmount = data.totalAmount - data.advancePaid;
  const order = await prisma.bulkOrder.create({
    data: {
      customerName: data.customerName,
      contactNumber: data.contactNumber,
      date: new Date(data.date),
      packType: data.packType,
      withRice: data.withRice,
      quantity: data.quantity,
      extras: data.extras,
      totalAmount: data.totalAmount,
      advancePaid: data.advancePaid,
      balanceAmount,
      status: data.status,
    },
  });

  if (data.advancePaid > 0) {
    await prisma.payment.create({
      data: {
        date: new Date(data.date),
        amount: data.advancePaid,
        method: 'CASH', // default
        referenceType: 'BULK_ORDER',
        referenceId: order.id,
        notes: `Advance payment for Bulk Order: ${data.customerName}`,
      },
    });
  }

  revalidatePath('/lunch-packs');
  revalidatePath('/dashboard');
  return order;
}

export async function updateBulkOrderStatus(id: string, status: string, additionalPayment?: { amount: number; method: string }) {
  const order = await prisma.bulkOrder.findUnique({ where: { id } });
  if (!order) throw new Error('Order not found');

  let advancePaid = order.advancePaid;
  if (additionalPayment && additionalPayment.amount > 0) {
    advancePaid += additionalPayment.amount;
    await prisma.payment.create({
      data: {
        date: new Date(),
        amount: additionalPayment.amount,
        method: additionalPayment.method,
        referenceType: 'BULK_ORDER',
        referenceId: id,
        notes: `Balance closure payment for Bulk Order`,
      },
    });
  }

  const balanceAmount = order.totalAmount - advancePaid;

  const updated = await prisma.bulkOrder.update({
    where: { id },
    data: {
      status,
      advancePaid,
      balanceAmount,
    },
  });

  revalidatePath('/lunch-packs');
  revalidatePath('/dashboard');
  return updated;
}

// ==========================================
// 4. CATERING ORDERS
// ==========================================

export async function getCateringOrders() {
  return prisma.cateringOrder.findMany({
    orderBy: { eventDate: 'asc' },
  });
}

export async function createCateringOrder(data: {
  customerName: string;
  contactNumber: string;
  eventDate: string;
  location: string;
  guestCount: number;
  menuItems: any;
  totalAmount: number;
  advanceAmount: number;
}) {
  const balanceAmount = data.totalAmount - data.advanceAmount;
  const paymentStatus =
    data.advanceAmount >= data.totalAmount
      ? 'FULLY_PAID'
      : data.advanceAmount > 0
      ? 'PARTIALLY_PAID'
      : 'PENDING';

  const order = await prisma.cateringOrder.create({
    data: {
      customerName: data.customerName,
      contactNumber: data.contactNumber,
      eventDate: new Date(data.eventDate),
      location: data.location,
      guestCount: data.guestCount,
      menuItems: data.menuItems,
      totalAmount: data.totalAmount,
      advanceAmount: data.advanceAmount,
      balanceAmount,
      status: 'PENDING',
      paymentStatus,
    },
  });

  if (data.advanceAmount > 0) {
    await prisma.payment.create({
      data: {
        date: new Date(),
        amount: data.advanceAmount,
        method: 'CASH',
        referenceType: 'CATERING',
        referenceId: order.id,
        notes: `Catering Advance: ${data.customerName}`,
      },
    });
  }

  revalidatePath('/catering');
  revalidatePath('/dashboard');
  return order;
}

export async function recordCateringPayment(id: string, amount: number, method: string, notes?: string) {
  const order = await prisma.cateringOrder.findUnique({ where: { id } });
  if (!order) throw new Error('Catering order not found');

  const newAdvance = order.advanceAmount + amount;
  const newBalance = order.totalAmount - newAdvance;
  const paymentStatus =
    newAdvance >= order.totalAmount
      ? 'FULLY_PAID'
      : newAdvance > 0
      ? 'PARTIALLY_PAID'
      : 'PENDING';

  const updatedOrder = await prisma.cateringOrder.update({
    where: { id },
    data: {
      advanceAmount: newAdvance,
      balanceAmount: newBalance,
      paymentStatus,
    },
  });

  await prisma.payment.create({
    data: {
      date: new Date(),
      amount,
      method,
      referenceType: 'CATERING',
      referenceId: id,
      notes: notes || `Catering Payment installment`,
    },
  });

  revalidatePath('/catering');
  revalidatePath('/dashboard');
  return updatedOrder;
}

export async function updateCateringStatus(id: string, status: string) {
  const order = await prisma.cateringOrder.update({
    where: { id },
    data: { status },
  });
  revalidatePath('/catering');
  revalidatePath('/dashboard');
  return order;
}

// ==========================================
// 5. MENU ITEMS & CURRY POINT
// ==========================================

export async function getMenuItems(category?: string) {
  const where = category ? { category, active: true } : { active: true };
  return prisma.menuItem.findMany({
    where,
    orderBy: { name: 'asc' },
  });
}

export async function createMenuItem(data: { name: string; category: string; price: number }) {
  const item = await prisma.menuItem.create({
    data,
  });
  revalidatePath('/settings');
  revalidatePath('/curry-point');
  return item;
}

// ==========================================
// 6. WORKERS & ATTENDANCE
// ==========================================

export async function getWorkers() {
  return prisma.worker.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function addWorker(data: {
  name: string;
  role: string;
  salaryType: string;
  rate: number;
  phone?: string;
}) {
  const worker = await prisma.worker.create({
    data: {
      name: data.name,
      role: data.role,
      salaryType: data.salaryType,
      rate: data.rate,
      phone: data.phone || null,
      active: true,
    },
  });
  revalidatePath('/workers');
  return worker;
}

export async function getAttendance(dateStr: string) {
  const dateObj = new Date(dateStr);
  const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  return prisma.attendance.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      worker: true,
    },
  });
}

export async function saveAttendanceRecords(
  dateStr: string,
  records: Array<{
    workerId: string;
    status: string;
    overtimeHours: number;
    notes?: string;
  }>
) {
  const dateObj = new Date(dateStr);
  const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);

  // Clear existing attendance for this day first
  await prisma.attendance.deleteMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const inserted = [];

  for (const record of records) {
    const worker = await prisma.worker.findUnique({ where: { id: record.workerId } });
    if (!worker) continue;

    // Calculate daily wage base on salary type
    let calculatedWage = 0;
    if (worker.salaryType === 'DAILY_WAGE') {
      if (record.status === 'PRESENT') {
        calculatedWage = worker.rate;
      } else if (record.status === 'HALF_DAY') {
        calculatedWage = worker.rate / 2;
      }
      // Add overtime wage (e.g., Hourly Overtime = Daily Rate / 8 * 1.5)
      if (record.overtimeHours > 0) {
        const hourlyRate = worker.rate / 8;
        calculatedWage += hourlyRate * record.overtimeHours * 1.5;
      }
    } else {
      // Monthly salaried workers
      // Wage is tracked daily as (Monthly / 30) for reporting, or remains 0 if attendance doesn't change it.
      // To track actual daily expense, we can log:
      if (record.status === 'PRESENT') {
        calculatedWage = worker.rate / 30;
      } else if (record.status === 'HALF_DAY') {
        calculatedWage = worker.rate / 60;
      }
      if (record.overtimeHours > 0) {
        const hourlyRate = (worker.rate / 30) / 8;
        calculatedWage += hourlyRate * record.overtimeHours * 1.5;
      }
    }

    const entry = await prisma.attendance.create({
      data: {
        date: new Date(dateStr),
        workerId: record.workerId,
        status: record.status,
        overtimeHours: record.overtimeHours,
        calculatedWage,
        notes: record.notes || null,
      },
    });

    // Also insert daily wages into Expenses if status is PRESENT/HALF_DAY to show in profit reports
    if (calculatedWage > 0) {
      // Create salary expense matching this day
      // Wait, we can either aggregate salaries at month end, or track it dynamically.
      // Dynamic tracking is better! We'll just sum attendance calculatedWage in reports.
    }

    inserted.push(entry);
  }

  revalidatePath('/workers');
  revalidatePath('/dashboard');
  return inserted;
}

export async function getWorkerPayroll(workerId: string, month: number, year: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  if (!worker) throw new Error('Worker not found');

  const attendance = await prisma.attendance.findMany({
    where: {
      workerId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  const totalWages = attendance.reduce((acc, curr) => acc + curr.calculatedWage, 0);
  const daysPresent = attendance.filter((a) => a.status === 'PRESENT').length;
  const daysHalf = attendance.filter((a) => a.status === 'HALF_DAY').length;
  const totalOvertime = attendance.reduce((acc, curr) => acc + curr.overtimeHours, 0);

  // Get payments logged as salary for this worker in this period
  const payments = await prisma.payment.findMany({
    where: {
      referenceType: 'SALARY',
      referenceId: workerId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
  const balance = totalWages - totalPaid;

  return {
    worker,
    attendance,
    totalWages,
    daysPresent,
    daysHalf,
    totalOvertime,
    totalPaid,
    balance,
  };
}

export async function payWorkerSalary(workerId: string, amount: number, method: string, notes?: string) {
  const payment = await prisma.payment.create({
    data: {
      date: new Date(),
      amount,
      method,
      referenceType: 'SALARY',
      referenceId: workerId,
      notes: notes || `Worker salary payment`,
    },
  });

  // Also log as an expense in the expenses database for P&L tracking
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });
  await prisma.expense.create({
    data: {
      date: new Date(),
      vendor: worker?.name || 'Staff',
      amount,
      category: 'SALARY',
      notes: `Salary payment. ${notes || ''}`,
    },
  });

  revalidatePath('/workers');
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return payment;
}

// ==========================================
// 7. INVENTORY MANAGEMENT
// ==========================================

export async function getInventory() {
  return prisma.inventoryItem.findMany({
    orderBy: { name: 'asc' },
  });
}

export async function recordInventoryTransaction(data: {
  inventoryItemId: string;
  type: string; // "PURCHASED", "CONSUMED", "ADJUSTED"
  quantity: number;
  unitPrice?: number;
  notes?: string;
}) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: data.inventoryItemId },
  });
  if (!item) throw new Error('Inventory item not found');

  let newStock = item.currentStock;
  if (data.type === 'PURCHASED' || data.type === 'ADJUSTED') {
    newStock += data.quantity;
  } else if (data.type === 'CONSUMED') {
    newStock -= data.quantity;
  }

  if (newStock < 0) newStock = 0; // prevent negative stock levels

  const transaction = await prisma.inventoryTransaction.create({
    data: {
      inventoryItemId: data.inventoryItemId,
      type: data.type,
      quantity: data.quantity,
      unitPrice: data.unitPrice || null,
      notes: data.notes || null,
      date: new Date(),
    },
  });

  await prisma.inventoryItem.update({
    where: { id: data.inventoryItemId },
    data: { currentStock: newStock },
  });

  // If purchased, record as expense automatically
  if (data.type === 'PURCHASED' && data.unitPrice && data.unitPrice > 0) {
    const totalCost = data.quantity * data.unitPrice;
    await prisma.expense.create({
      data: {
        date: new Date(),
        vendor: 'Inventory Restock',
        amount: totalCost,
        category: 'KITCHEN_SUPPLIES',
        notes: `Purchased ${data.quantity} ${item.unit} of ${item.name} @ ₹${data.unitPrice}/${item.unit}`,
      },
    });
  }

  revalidatePath('/inventory');
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return transaction;
}

export async function addInventoryItem(data: { name: string; unit: string; minStockLevel: number }) {
  const item = await prisma.inventoryItem.create({
    data: {
      name: data.name,
      unit: data.unit,
      minStockLevel: data.minStockLevel,
      currentStock: 0,
    },
  });
  revalidatePath('/inventory');
  return item;
}

export async function getInventoryTransactions() {
  return prisma.inventoryTransaction.findMany({
    include: {
      inventoryItem: true,
    },
    orderBy: { date: 'desc' },
    take: 50,
  });
}

// ==========================================
// 8. EXPENSE MANAGEMENT
// ==========================================

export async function getExpenses(category?: string) {
  const where = category ? { category } : {};
  return prisma.expense.findMany({
    where,
    orderBy: { date: 'desc' },
  });
}

export async function createExpense(data: {
  vendor: string;
  amount: number;
  category: string;
  notes?: string;
  billImage?: string;
  date: string;
}) {
  const expense = await prisma.expense.create({
    data: {
      date: new Date(data.date),
      vendor: data.vendor,
      amount: data.amount,
      category: data.category,
      notes: data.notes || null,
      billImage: data.billImage || null,
    },
  });
  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  return expense;
}

// ==========================================
// 9. DASHBOARD STATS
// ==========================================

export async function getDashboardStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // 1. Sales today
  const lunchSalesToday = await prisma.dailyLunchTransaction.aggregate({
    where: { date: { gte: startOfToday, lte: endOfToday } },
    _sum: { totalAmount: true },
  });

  const bulkSalesToday = await prisma.bulkOrder.aggregate({
    where: { date: { gte: startOfToday, lte: endOfToday } },
    _sum: { totalAmount: true },
  });

  // Sum payments received today (real cashflow)
  const paymentsToday = await prisma.payment.aggregate({
    where: { date: { gte: startOfToday, lte: endOfToday } },
    _sum: { amount: true },
  });

  const salesToday =
    (lunchSalesToday._sum.totalAmount || 0) +
    (bulkSalesToday._sum.totalAmount || 0);

  // 2. Expenses today
  const expensesTodayAgg = await prisma.expense.aggregate({
    where: { date: { gte: startOfToday, lte: endOfToday } },
    _sum: { amount: true },
  });
  
  // Salary paid + inventory bought are also logged as expenses, so this captures everything
  const expensesToday = expensesTodayAgg._sum.amount || 0;
  const profitToday = salesToday - expensesToday;

  // 3. Sales this month
  const lunchSalesMonthAgg = await prisma.dailyLunchTransaction.aggregate({
    where: { date: { gte: startOfMonth } },
    _sum: { totalAmount: true },
  });

  // Find unique monthly customers who had active deliveries this month
  const activeMonthlyCustomersThisMonth = await prisma.lunchCustomer.findMany({
    where: {
      mode: 'MONTHLY',
      transactions: {
        some: {
          date: { gte: startOfMonth }
        }
      }
    },
    select: { monthlyPrice: true }
  });

  const monthlySubscriptionsThisMonth = activeMonthlyCustomersThisMonth.reduce(
    (sum, c) => sum + (c.monthlyPrice || 0),
    0
  );

  const lunchSalesMonth = (lunchSalesMonthAgg._sum.totalAmount || 0) + monthlySubscriptionsThisMonth;

  const bulkSalesMonth = await prisma.bulkOrder.aggregate({
    where: { date: { gte: startOfMonth } },
    _sum: { totalAmount: true },
  });

  const salesMonth =
    (lunchSalesMonth || 0) +
    (bulkSalesMonth._sum.totalAmount || 0);

  const expensesMonthAgg = await prisma.expense.aggregate({
    where: { date: { gte: startOfMonth } },
    _sum: { amount: true },
  });
  const expensesMonth = expensesMonthAgg._sum.amount || 0;
  const revenueMonth = salesMonth; // total billing in the month

  // 4. Pending Catering Payments
  const cateringPending = await prisma.cateringOrder.findMany({
    where: {
      paymentStatus: { in: ['PENDING', 'PARTIALLY_PAID'] },
      status: { not: 'CANCELLED' },
    },
    select: { balanceAmount: true },
  });
  const pendingCateringPayments = cateringPending.reduce((acc, curr) => acc + curr.balanceAmount, 0);

  // 5. Worker Attendance count today
  const attendanceToday = await prisma.attendance.count({
    where: {
      date: { gte: startOfToday, lte: endOfToday },
      status: { in: ['PRESENT', 'HALF_DAY'] },
    },
  });

  // 6. Low Inventory Alert
  const lowInventoryItems = await prisma.inventoryItem.findMany({
    where: {
      currentStock: {
        lte: prisma.inventoryItem.fields.minStockLevel,
      },
    },
  });

  return {
    salesToday,
    expensesToday,
    profitToday,
    revenueMonth,
    expensesMonth,
    pendingCateringPayments,
    workerAttendanceToday: attendanceToday,
    lowStockCount: lowInventoryItems.length,
    lowStockItems: lowInventoryItems.map((item) => item.name),
    cashflowToday: paymentsToday._sum.amount || 0,
  };
}

export async function getReportStats(startDateStr: string, endDateStr: string) {
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  // Lunch pack sales
  const lunchSales = await prisma.dailyLunchTransaction.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: { customer: true },
  });

  // Bulk orders
  const bulkSales = await prisma.bulkOrder.findMany({
    where: { date: { gte: startDate, lte: endDate } },
  });

  // Catering orders confirmed/active
  const cateringOrders = await prisma.cateringOrder.findMany({
    where: { eventDate: { gte: startDate, lte: endDate } },
  });

  // Expenses
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startDate, lte: endDate } },
  });

  // Sum calculations
  let totalLunch = lunchSales.reduce((sum, o) => sum + o.totalAmount, 0);

  // Add flat monthly pricing for monthly customers who had active deliveries in this period
  const activeMonthlyCustomerIds = Array.from(
    new Set(
      lunchSales
        .filter((o) => o.customer.mode === 'MONTHLY')
        .map((o) => o.customerId)
    )
  );

  const activeMonthlyCustomers = await prisma.lunchCustomer.findMany({
    where: { id: { in: activeMonthlyCustomerIds } },
    select: { monthlyPrice: true },
  });

  const monthlySubscriptions = activeMonthlyCustomers.reduce(
    (sum, c) => sum + (c.monthlyPrice || 0),
    0
  );

  totalLunch += monthlySubscriptions;

  const totalBulk = bulkSales.reduce((sum, o) => sum + o.totalAmount, 0);
  
  // In catering, we account the money as revenue when billed / paid (advance + balance received)
  // Wait, let's look at actual payments logged as cashflow in this period
  const payments = await prisma.payment.findMany({
    where: { date: { gte: startDate, lte: endDate } },
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSales = totalLunch + totalBulk; // standard billing revenue

  return {
    totalSales,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
    totalLunch,
    totalBulk,
    lunchTransactionsCount: lunchSales.length,
    bulkOrdersCount: bulkSales.length,
    cateringConfirmedCount: cateringOrders.length,
    expenses,
    payments,
    lunchSales,
    bulkSales,
    cateringOrders,
  };
}

// ==========================================
// 10. SYSTEM USER MANAGEMENT
// ==========================================

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUser(data: {
  email: string;
  password?: string;
  name: string;
  role: string;
}) {
  const hashedPassword = bcrypt.hashSync(data.password || 'password123', 10);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      name: data.name.trim(),
      role: data.role,
      active: true,
    },
  });
  revalidatePath('/settings');
  return user;
}

export async function updateUser(
  id: string,
  data: {
    email: string;
    password?: string;
    name: string;
    role: string;
    active: boolean;
  }
) {
  const updateData: any = {
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    role: data.role,
    active: data.active,
  };
  if (data.password && data.password.trim() !== '') {
    updateData.password = bcrypt.hashSync(data.password, 10);
  }
  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });
  revalidatePath('/settings');
  return user;
}

export async function deleteUser(id: string) {
  const user = await prisma.user.delete({
    where: { id },
  });
  revalidatePath('/settings');
  return user;
}

// ==========================================
// 7. LUNCH PACK PRICE MASTER CRUD
// ==========================================

export async function getLunchPackPrices() {
  return prisma.lunchPackPrice.findMany({
    orderBy: [
      { mode: 'asc' },
      { packType: 'asc' },
      { withRice: 'asc' }
    ]
  });
}

export async function createLunchPackPrice(data: {
  mode: string;
  packType: string;
  withRice: boolean;
  price: number;
}) {
  const plan = await prisma.lunchPackPrice.create({
    data: {
      mode: data.mode.toUpperCase().trim(),
      packType: data.packType.toUpperCase().trim(),
      withRice: data.withRice,
      price: data.price,
      active: true,
    },
  });
  revalidatePath('/lunch-packs');
  return plan;
}

export async function updateLunchPackPrice(
  id: string,
  data: {
    price?: number;
    active?: boolean;
  }
) {
  const plan = await prisma.lunchPackPrice.update({
    where: { id },
    data: {
      price: data.price !== undefined ? data.price : undefined,
      active: data.active !== undefined ? data.active : undefined,
    },
  });
  revalidatePath('/lunch-packs');
  return plan;
}

export async function deleteLunchPackPrice(id: string) {
  const plan = await prisma.lunchPackPrice.delete({
    where: { id },
  });
  revalidatePath('/lunch-packs');
  return plan;
}
