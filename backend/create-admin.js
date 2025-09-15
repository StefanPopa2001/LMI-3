const { PrismaClient } = require('@prisma/client');
const CryptoJS = require('crypto-js');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Generate salt and hash password
    const salt = CryptoJS.lib.WordArray.random(128/8).toString();
    const hashedPassword = CryptoJS.SHA256('BAZOU' + salt).toString();
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: 'admin@codeitbryan.be' }
    });

    if (existingUser) {
      console.log('User already exists, updating...');
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          mdp: hashedPassword,
          sel: salt,
          admin: true,
          nom: 'Admin',
          prenom: 'CodeItBryan'
        }
      });
      console.log('Admin user updated successfully!');
    } else {
      console.log('Creating new admin user...');
      await prisma.user.create({
        data: {
          email: 'admin@codeitbryan.be',
          mdp: hashedPassword,
          sel: salt,
          admin: true,
          nom: 'Admin',
          prenom: 'CodeItBryan'
        }
      });
      console.log('Admin user created successfully!');
    }

    console.log('User credentials:');
    console.log('Email: admin@codeitbryan.be');
    console.log('Password: BAZOU');
    console.log('Role: Administrator');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
