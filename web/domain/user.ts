export type UserRole = "admin" | "sa" | "analyst";

export type UserStatus = "active" | "banned";

export type UserRow = {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

