import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import Employee from '../src/models/employee.model.js';
import Service from '../src/models/service.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

const uri = process.env.MONGODB_URI;
if (!uri) {
    console.error('MONGODB_URI is required in server/.env');
    process.exit(1);
}

async function main() {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    const shopId = new mongoose.Types.ObjectId('6a22975e1e3a03459a6b6c56'); // Rajesh Royal Salon

    // 1. Seed the missing Service
    const serviceId = new mongoose.Types.ObjectId('6a22975ed123c10f9ea76ce1');
    const existingService = await Service.findById(serviceId);
    if (!existingService) {
        await Service.create({
            _id: serviceId,
            shopId: shopId,
            serviceName: 'Signature Haircut',
            serviceType: 'single',
            serviceFor: 'men',
            imageMediaId: 'images/services/default/service.jpg',
            duration: 45,
            actualPrice: 500,
            offerPrice: 50,
            finalPrice: 450,
            isActive: true,
            deletedAt: null
        });
        console.log('Seeded missing service 6a22975ed123c10f9ea76ce1 successfully.');
    } else {
        console.log('Service 6a22975ed123c10f9ea76ce1 already exists.');
    }

    // 2. Seed the missing Employee
    const employeeId = new mongoose.Types.ObjectId('6a22975ed123c10f9ea76ce0');
    const existingEmployee = await Employee.findById(employeeId);
    if (!existingEmployee) {
        await Employee.create({
            _id: employeeId,
            shopId: shopId,
            firstName: 'Marco',
            lastName: 'Fixture',
            phoneNumber: '+919876543210',
            gender: 'male',
            dateOfBirth: new Date('1992-09-09'),
            photoMediaId: 'images/employees/mock-shop/mock-employee-photo.jpg',
            workingHours: {
                start: '09:00',
                end: '20:00'
            },
            bookedSlots: [],
            blockedDates: [],
            isActive: true,
            deletedAt: null
        });
        console.log('Seeded missing employee 6a22975ed123c10f9ea76ce0 successfully.');
    } else {
        console.log('Employee 6a22975ed123c10f9ea76ce0 already exists.');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
}

main().catch(console.error);
