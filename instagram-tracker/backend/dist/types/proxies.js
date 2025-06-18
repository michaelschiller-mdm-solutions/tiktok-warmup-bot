"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyConstraintError = exports.ProxyAssignmentError = exports.ProxyError = void 0;
class ProxyError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ProxyError';
    }
}
exports.ProxyError = ProxyError;
class ProxyAssignmentError extends ProxyError {
    constructor(message, account_id, proxy_id) {
        super(message, 'ASSIGNMENT_ERROR');
        this.account_id = account_id;
        this.proxy_id = proxy_id;
        this.name = 'ProxyAssignmentError';
    }
}
exports.ProxyAssignmentError = ProxyAssignmentError;
class ProxyConstraintError extends ProxyError {
    constructor(message, constraint) {
        super(message, 'CONSTRAINT_ERROR');
        this.constraint = constraint;
        this.name = 'ProxyConstraintError';
    }
}
exports.ProxyConstraintError = ProxyConstraintError;
//# sourceMappingURL=proxies.js.map