import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    const existingEmployee = await prisma.user.findUnique({
      where: { username: 'employee' }
    });

    const results = [];

    // Seed Admin
    if (!existingAdmin) {
      const adminPass = hashPassword('admin123');
      const newAdmin = await prisma.user.create({
        data: {
          username: 'admin',
          full_name: 'PZHR Administrator',
          password_hash: adminPass,
          role: 'ADMIN'
        }
      });
      results.push(`Admin created: ${newAdmin.username}`);
    } else {
      results.push(`Admin already exists: ${existingAdmin.username}`);
    }

    // Seed Employee
    if (!existingEmployee) {
      const employeePass = hashPassword('employee123');
      const newEmployee = await prisma.user.create({
        data: {
          username: 'employee',
          full_name: 'Jane Doe',
          password_hash: employeePass,
          role: 'EMPLOYEE'
        }
      });
      results.push(`Employee created: ${newEmployee.username}`);
    } else {
      results.push(`Employee already exists: ${existingEmployee.username}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      details: results
    });

  } catch (error) {
    console.error('Seeding error:', error);
    const err = error as Error;
    return NextResponse.json({
      success: false,
      error: 'Failed to seed database',
      message: err.message || String(error)
    }, { status: 500 });
  }
}
