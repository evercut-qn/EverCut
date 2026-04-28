import { Router } from 'express';

import * as employeeController from '../controllers/employee.controller.js';
import authenticate from '../middleware/authenticate.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { uploadEmployeePhoto } from '../middleware/upload.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { ROLES } from '../utils/constants.js';
import { paginationSchema } from '../validators/common.validator.js';
import {
    addEmployeeSchema,
    availableSlotsQuerySchema,
    employeeIdParamSchema,
    updateEmployeeSchema,
} from '../validators/employee.validator.js';
import { employeeCalendarQuerySchema } from '../validators/booking.validator.js';

const router = Router();

router.get(
    '/:id/calendar',
    authenticate,
    validate(employeeIdParamSchema, 'params'),
    validate(employeeCalendarQuerySchema, 'query'),
    employeeController.getEmployeeCalendar,
);

router.get(
    '/:id/available-slots',
    authenticate,
    validate(employeeIdParamSchema, 'params'),
    validate(availableSlotsQuerySchema, 'query'),
    employeeController.getAvailableSlots,
);

router.use(authenticate, authorize(ROLES.BARBER));

router.get('/', validate(paginationSchema, 'query'), employeeController.getEmployees);
router.post('/', uploadEmployeePhoto, validate(addEmployeeSchema, 'body'), employeeController.addEmployee);
router.put('/:id', validate(employeeIdParamSchema, 'params'), uploadEmployeePhoto, validate(updateEmployeeSchema, 'body'), employeeController.updateEmployee);
router.delete('/:id', validate(employeeIdParamSchema, 'params'), employeeController.deleteEmployee);

export default router;
