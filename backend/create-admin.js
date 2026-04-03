const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await db.Admin.create({
    username: 'admin',
    password: hashedPassword,
    role: 'super',
    permissions: JSON.stringify(['all'])
  });

  console.log('管理员创建成功！');
  console.log('用户名: admin');
  console.log('密码: 123456');
  process.exit(0);
}

db.sequelize.sync().then(() => {
  createAdmin();
});