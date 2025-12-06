const CryptoJS = require('crypto-js');

exports.encrypt = (data, key) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
};

exports.decrypt = (encrypted, key) => {
  const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
};
