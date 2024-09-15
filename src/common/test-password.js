export default function testPassword (pass) {
  // 密码支持特殊符号
  return /^[\da-zA-Z~!@#$%^&*()_\-+=,<>:;\\|/?]{6,20}$/.test(pass) &&
          /[a-zA-Z]/.test(pass) &&
          /[\d]/.test(pass)
}
