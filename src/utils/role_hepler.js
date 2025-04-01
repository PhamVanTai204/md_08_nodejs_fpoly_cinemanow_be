// src/utils/role.helper.js
const getRoleName = (role) => {
  switch (role) {
    case 1: return 'Thành viên';
    case 2: return 'Quản trị viên';
    case 3: return 'Nhân viên rạp';
    default: return 'Không xác định';
  }
};

module.exports = { getRoleName };
