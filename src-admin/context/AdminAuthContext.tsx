import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";

interface AdminUser {
  id: string;
  email: string;
  userType: string;
  adminLevel?: "super" | "standard" | null;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(
  undefined
);

const API_URL = import.meta.env.VITE_API_URL || "";

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get<AdminUser>(`${API_URL}/api/me`, {
        withCredentials: true,
      });

      if (response.data && response.data.userType === "admin") {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // First, authenticate
    await axios.post(
      `${API_URL}/api/login`,
      { identifier: email, password },
      { withCredentials: true }
    );

    // Then fetch user data
    const meResponse = await axios.get<AdminUser>(`${API_URL}/api/me`, {
      withCredentials: true,
    });

    if (meResponse.data.userType !== "admin") {
      throw new Error(
        "Accesso non autorizzato. Solo gli amministratori possono accedere."
      );
    }

    setUser(meResponse.data);
  };

  const logout = async () => {
    try {
      await axios.post(`${API_URL}/api/logout`, {}, { withCredentials: true });
    } catch {
      // Ignore logout errors
    }
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isSuperAdmin: user?.adminLevel === "super",
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
};
