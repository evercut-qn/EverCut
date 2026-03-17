import customerRepository from '../repositories/customer.repository.js';
import userRepository from '../repositories/user.repository.js';
import { NotFoundError, BadRequestError } from '../utils/api-error.js';
import cloudinary from '../config/cloudinary.config.js';

/**
 * Customer-facing profile service.
 */

export const getProfile = async (userId) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');
    return profile;
};

export const getHomeProfile = async (userId) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');

    return {
        photo: profile.photoUrl || null,
        name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
        address: profile.address || '',
    };
};

export const updateProfile = async (userId, data, file) => {
    const profile = await customerRepository.findByUserId(userId);
    if (!profile) throw new NotFoundError('Customer');

    // Handle photo replacement
    if (file) {
        // Delete old photo from Cloudinary
        if (profile.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(profile.cloudinaryId);
            } catch {
                // Non-fatal — log but continue
            }
        }
        data.photoUrl = file.path;
        data.cloudinaryId = file.filename || file.public_id;
    }

    // Parse location if string
    if (data.location && typeof data.location === 'string') {
        try {
            data.location = JSON.parse(data.location);
        } catch {
            throw new BadRequestError('Invalid location format');
        }
    }

    // Update profile (only provided fields overwrite)
    const updated = await customerRepository.updateByUserId(userId, data);

    // Also update email on User model if changed
    if (data.email) {
        const currentUser = await userRepository.findById(userId);
        if (currentUser && currentUser.email !== data.email) {
            const existingUser = await userRepository.findByEmail(data.email);
            if (existingUser && existingUser._id.toString() !== userId.toString()) {
                throw new BadRequestError('Email is already in use');
            }
            await userRepository.updateById(userId, { 
                email: data.email,
                emailVerified: false 
            });
        }
    }

    return updated;
};
