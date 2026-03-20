import * as employeeService from '../../services/employee.service.js';
import { ApiResponse } from '../../utils/api-response.js';
import { getValidatedRequestData } from '../../utils/request-validation.utils.js';

export const addEmployee = async (req, res, next) => {
    try {
        const body = getValidatedRequestData(req, 'body');
        const employee = await employeeService.addEmployee(req.user._id, body, req.file);
        return res.status(201).json(ApiResponse.success(employee, 'Employee added'));
    } catch (err) {
        next(err);
    }
};

export const getEmployees = async (req, res, next) => {
    try {
        const query = getValidatedRequestData(req, 'query');
        const result = await employeeService.getEmployees(req.user._id, query);
        return res.status(200).json(ApiResponse.paginated(result.items, result.pagination, 'Employees fetched'));
    } catch (err) {
        next(err);
    }
};

export const updateEmployee = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const body = getValidatedRequestData(req, 'body');
        const employee = await employeeService.updateEmployee(req.user._id, params.id, body, req.file);
        return res.status(200).json(ApiResponse.success(employee, 'Employee updated'));
    } catch (err) {
        next(err);
    }
};

export const deleteEmployee = async (req, res, next) => {
    try {
        const params = getValidatedRequestData(req, 'params');
        const result = await employeeService.deleteEmployee(req.user._id, params.id);
        return res.status(200).json(ApiResponse.success(result, 'Employee deleted'));
    } catch (err) {
        next(err);
    }
};
