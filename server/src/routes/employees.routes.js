import { Router } from 'express';

import * as employeeController from '../controllers/employee.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { paginationSchema } from '../validators/common.validator.js';
import {
    addEmployeeSchema,
    employeeAvailabilityQuerySchema,
    employeeIdParamSchema,
    updateEmployeeAvailabilitySchema,
    updateEmployeeSchema,
} from '../validators/employee.validator.js';

const router = Router();

// All employee routes require authentication
router.use(authenticate);

router.get('/daily-progress', authorize(ROLES.BARBER), employeeController.getStaffDailyProgress);

// Routes accessible by both CUSTOMER and BARBER
router.get(
    '/:id/availability',
    authorize(ROLES.CUSTOMER, ROLES.BARBER),
    validate(employeeIdParamSchema, 'params'),
    validate(employeeAvailabilityQuerySchema, 'query'),
    employeeController.getEmployeeAvailability,
);

// All remaining routes require BARBER role
router.use(authorize(ROLES.BARBER));
router.get('/', validate(paginationSchema, 'query'), employeeController.getEmployees);
router.get('/:id', validate(employeeIdParamSchema, 'params'), employeeController.getEmployeeById);
router.post('/', validate(addEmployeeSchema, 'body'), employeeController.addEmployee);
router.patch('/:id', validate(employeeIdParamSchema, 'params'), validate(updateEmployeeSchema, 'body'), employeeController.updateEmployee);
router.put('/:id/blocked-dates', validate(employeeIdParamSchema, 'params'), validate(updateEmployeeAvailabilitySchema, 'body'), employeeController.updateEmployeeAvailability);
router.delete('/:id', validate(employeeIdParamSchema, 'params'), employeeController.deleteEmployee);

export default router;
