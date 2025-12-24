import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Scale, User, LogOut, Users } from "lucide-react";

import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const navigate = useNavigate();

  const handleGoDashboard = () => {
    navigate("/dashboard");
  };

  const handleGoUsers = () => {
    navigate("/users");
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* ================= HEADER FIXE ================= */}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          {/* Logo + titre */}
          <button
            type="button"
            onClick={handleGoDashboard}
            className="flex items-center gap-3 focus:outline-none"
          >
            <Scale className="w-8 h-8" />
            <div className="text-left">
              <h1 className="text-2xl font-bold">Police Judiciaire</h1>
              <p className="text-sm opacity-90">
                Système de Gestion des Événements
              </p>
            </div>
          </button>

          {/* Menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-primary/40 bg-primary-foreground/10"
              >
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Utilisateur</DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleGoUsers}
                className="cursor-pointer"
              >
                <Users className="w-4 h-4 mr-2" />
                <span>Gestion des utilisateurs</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ================= CONTENU SCROLLABLE ================= */}
      <main className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {title && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground">{title}</h2>
          </div>
        )}
        {children}
      </main>

      {/* ================= FOOTER FIXE ================= */}
      <footer className="sticky bottom-0 z-40 border-t border-border bg-secondary/90 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          © 2024 Police Judiciaire – Système de Gestion des Événements
        </div>
      </footer>
    </div>
  );
}
