const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Admin User
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ssc.com' },
    update: {},
    create: {
      email: 'admin@ssc.com',
      password: adminPassword,
      name: 'SSC Admin',
      role: 'ADMIN',
      active: true,
    },
  });
  console.log('Admin user seeded:', admin.email);

  // 2. Settings (Pricing and Configuration)
  const settings = [
    { key: 'single_pack_price', value: '120', description: 'Price of Single Lunch Pack without Rice' },
    { key: 'single_pack_rice_price', value: '150', description: 'Price of Single Lunch Pack with Rice' },
    { key: 'double_pack_price', value: '200', description: 'Price of Double Lunch Pack without Rice' },
    { key: 'double_pack_rice_price', value: '300', description: 'Price of Double Lunch Pack with Rice' },
    { key: 'extra_curry_price', value: '40', description: 'Price of Extra Curry add-on' },
    { key: 'extra_rice_price', value: '30', description: 'Price of Extra Rice add-on' },
    { key: 'sweet_price', value: '25', description: 'Price of Sweet add-on' },
    { key: 'fry_price', value: '35', description: 'Price of Fry add-on' },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }
  console.log('Settings seeded.');

  // 3. Menu Items (Curry Point & Extras)
  const menuItems = [
    { name: '250g Curry', category: 'CURRY_POINT', price: 60 },
    { name: '500g Curry', category: 'CURRY_POINT', price: 120 },
    { name: '1kg Curry', category: 'CURRY_POINT', price: 240 },
    { name: 'Rice', category: 'CURRY_POINT', price: 30 },
    { name: 'Pulusu', category: 'CURRY_POINT', price: 40 },
    { name: 'Sambar', category: 'CURRY_POINT', price: 40 },
    { name: 'Sweet', category: 'CURRY_POINT', price: 25 },
    { name: 'Pickle', category: 'CURRY_POINT', price: 15 },
    { name: 'Fry', category: 'CURRY_POINT', price: 50 },
    { name: 'Extra Curry', category: 'LUNCH_PACK_EXTRA', price: 40 },
    { name: 'Extra Rice', category: 'LUNCH_PACK_EXTRA', price: 30 },
    { name: 'Sweet Extra', category: 'LUNCH_PACK_EXTRA', price: 25 },
    { name: 'Fry Extra', category: 'LUNCH_PACK_EXTRA', price: 35 },
  ];

  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({
      where: { name: item.name, category: item.category },
    });
    if (!existing) {
      await prisma.menuItem.create({ data: item });
    }
  }
  console.log('Menu items seeded.');

  // 4. Lunch Customers (Mock data)
  const customers = [
    { id: 'LP0001', qrCode: 'LP0001', name: 'Raju Verma', phone: '9848012345', defaultPackType: 'SINGLE', defaultWithRice: true },
    { id: 'LP0002', qrCode: 'LP0002', name: 'Sita Devi', phone: '9440154321', defaultPackType: 'SINGLE', defaultWithRice: false },
    { id: 'LP0003', qrCode: 'LP0003', name: 'Kiran Kumar', phone: '8123456789', defaultPackType: 'DOUBLE', defaultWithRice: true },
    { id: 'LP0004', qrCode: 'LP0004', name: 'Anjali', phone: '7012345678', defaultPackType: 'DOUBLE', defaultWithRice: false },
  ];

  for (const c of customers) {
    await prisma.lunchCustomer.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log('Lunch pack customers seeded.');

  // 5. Workers
  const workers = [
    { name: 'Koteswara Rao', role: 'COOK', salaryType: 'DAILY_WAGE', rate: 900, phone: '9000112233' },
    { name: 'Subba Rao', role: 'HELPER', salaryType: 'DAILY_WAGE', rate: 550, phone: '9000223344' },
    { name: 'Ravi', role: 'SERVER', salaryType: 'DAILY_WAGE', rate: 600, phone: '9000334455' },
    { name: 'Saraswathi', role: 'CLEANER', salaryType: 'MONTHLY', rate: 12000, phone: '9000445566' },
    { name: 'Apparao', role: 'DRIVER', salaryType: 'DAILY_WAGE', rate: 700, phone: '9000556677' },
  ];

  for (const w of workers) {
    const existing = await prisma.worker.findFirst({
      where: { name: w.name },
    });
    if (!existing) {
      await prisma.worker.create({ data: w });
    }
  }
  console.log('Workers seeded.');

  // 6. Inventory Items
  const inventoryItems = [
    { name: 'Rice', unit: 'kg', currentStock: 150.0, minStockLevel: 25.0 },
    { name: 'Dal', unit: 'kg', currentStock: 80.0, minStockLevel: 15.0 },
    { name: 'Oil', unit: 'liter', currentStock: 60.0, minStockLevel: 10.0 },
    { name: 'Gas Cylinders', unit: 'cylinder', currentStock: 4.0, minStockLevel: 1.0 },
    { name: 'Milk', unit: 'liter', currentStock: 20.0, minStockLevel: 3.0 },
    { name: 'Masala Spices', unit: 'kg', currentStock: 15.0, minStockLevel: 2.0 },
    { name: 'Vegetables', unit: 'kg', currentStock: 50.0, minStockLevel: 10.0 },
  ];

  for (const inv of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { name: inv.name },
      update: {},
      create: inv,
    });
  }
  console.log('Inventory items seeded.');

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
