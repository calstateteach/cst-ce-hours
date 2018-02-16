/* Database field constants.
10.18.2017 tps Created.
11.01.2017 tps Added states.
11.17.2017 tps Revised states
02.08.2018 tps Add "Inactive" state for approval requests.
*/

exports.NEEDY      = 'Needy'; // Needs mentor review
exports.PENDING    = 'Pending';  // Included in a approval request
exports.APPROVED   = 'Approved'; 
exports.DENIED     = 'Denied';
exports.DROPPED    = 'Dropped';  // Deleted from approval request
exports.REVISED    = 'Revised';  // Record denied by mentor has been revised & resubmitted by teacher candidate
exports.ROLLED     = 'Rollover'; // Approval request's hours have rolled over to a newer approval request
exports.INACTIVE   = 'Inactive'; // Approval requests left pending from a previous term.

exports.HOURS_STATES   = [ exports.NEEDY, exports.PENDING, exports.APPROVED, exports.DENIED, exports.DROPPED ];
exports.REQUEST_STATES = [ exports.PENDING, exports.APPROVED, exports.DENIED, exports.REVISED, exports.ROLLED, exports.INACTIVE];

exports.INTERN          = 'Intern';
exports.STUDENT_TEACHER = 'StudentTeacher';
exports.CANDIDATE_TYPES = [ exports.INTERN, exports.STUDENT_TEACHER ];