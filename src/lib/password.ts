import bcrypt from "bcrypt";

// กำหนด Cost Factor / Salt Rounds ที่ 10 (มาตรฐานความปลอดภัย ใช้เวลาประมวลผลประมาณ 100-500ms)
const SALT_ROUNDS = 10;

/**
 * แฮชรหัสผ่านสำหรับขั้นตอนสมัครสมาชิก (Sign Up / Register)
 * @param plainPassword รหัสผ่านข้อความธรรมดาที่ผู้ใช้กรอก
 * @returns สตริงรหัสผ่านที่ผ่านการแฮชและรวม Salt เรียบร้อยแล้ว
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hashedPassword;
}

/**
 * เปรียบเทียบรหัสผ่านสำหรับขั้นตอนเข้าสู่ระบบ (Sign In / Login)
 * @param plainPassword รหัสผ่านที่ผู้ใช้กรอกเข้ามา
 * @param hashedPassword รหัสผ่านที่แฮชแล้วซึ่งเก็บอยู่ใน Database
 * @returns true หากรหัสผ่านถูกต้อง, false หากไม่ถูกต้อง
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
}