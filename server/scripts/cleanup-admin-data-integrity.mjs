import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Barber from '../src/models/barber.model.js';
import Shop from '../src/models/shop.model.js';
import User from '../src/models/user.model.js';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });

const apply = process.argv.includes('--apply');

if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
}

await mongoose.connect(process.env.MONGODB_URI);

const barbersWithoutUsers = await Barber.aggregate([
    { $match: { deletedAt: null } },
    { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
    { $match: { user: { $size: 0 } } },
    { $project: { _id: 1, userId: 1, firstName: 1, lastName: 1 } },
]);

const shopsWithoutBarbers = await Shop.aggregate([
    { $match: { deletedAt: null } },
    { $lookup: { from: 'barbers', localField: 'barberId', foreignField: '_id', as: 'barber' } },
    { $match: { barber: { $size: 0 } } },
    { $project: { _id: 1, barberId: 1, shopName: 1 } },
]);

const barberUsersWithoutProfiles = await User.aggregate([
    { $match: { roleType: 'BARBER', deletedAt: null } },
    { $lookup: { from: 'barbers', localField: '_id', foreignField: 'userId', as: 'barber' } },
    { $match: { barber: { $size: 0 } } },
    { $project: { _id: 1, email: 1, phoneNumber: 1 } },
]);

if (apply) {
    if (barbersWithoutUsers.length > 0) {
        await Barber.deleteMany({ _id: { $in: barbersWithoutUsers.map((barber) => barber._id) } });
    }
    if (shopsWithoutBarbers.length > 0) {
        await Shop.deleteMany({ _id: { $in: shopsWithoutBarbers.map((shop) => shop._id) } });
    }
}

const [barberUsers, barberProfiles, shops] = await Promise.all([
    User.countDocuments({ roleType: 'BARBER', deletedAt: null }),
    Barber.countDocuments({ deletedAt: null }),
    Shop.countDocuments({ deletedAt: null }),
]);

console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    removed: apply ? {
        barbersWithoutUsers: barbersWithoutUsers.length,
        shopsWithoutBarbers: shopsWithoutBarbers.length,
    } : undefined,
    findings: {
        barbersWithoutUsers,
        shopsWithoutBarbers,
        barberUsersWithoutProfiles,
    },
    counts: {
        barberUsers,
        barberProfiles,
        shops,
    },
    oneToOneValid: barberUsers === barberProfiles && barberProfiles === shops,
}, null, 2));

await mongoose.disconnect();
