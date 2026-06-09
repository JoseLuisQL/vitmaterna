/**
 * VITMATERNA User Types
 */

export interface User {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  profileImageUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'gestante' | 'obstetra' | 'admin';

export interface GestanteProfile {
  id: string;
  userId: string;
  pregnancyWeek: number;
  dueDate: string;
  riskLevel: RiskLevel;
  bloodType: string | null;
  weight: number | null;
  height: number | null;
  obstetraId: string | null;
  lastCheckup: string | null;
}

export interface ObstetraProfile {
  id: string;
  userId: string;
  cop: string;
  specialty: string;
  hospital: string | null;
  activePatients: number;
}

export type RiskLevel = 'bajo' | 'medio' | 'alto';

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  dni: string;
  password: string;
}

export interface RegisterRequest {
  dni: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  cop?: string;
  consentAccepted: boolean;
}

export interface ForgotPasswordRequest {
  dni: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}
