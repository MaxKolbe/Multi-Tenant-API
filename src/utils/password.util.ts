import bcrypt from "bcryptjs";

const SALT_ROUND = 10;
export const hashPassword = async (plainText: string): Promise<string> => {
  return await bcrypt.hash(plainText, SALT_ROUND);
};

export const verifyPassword = async (plainText: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(plainText, hash);
};