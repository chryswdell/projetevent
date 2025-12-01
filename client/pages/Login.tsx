import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Scale,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate("/");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await authService.login(email, password);

      toast({
        title: "Connexion réussie",
        description: (
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Bienvenue, {user.name}.</span>
          </div>
        ),
      });

      navigate("/");
    } catch (err: any) {
      console.error("Erreur de login", err);

      const message =
        err?.response?.data?.message ||
        "Identifiants incorrects. Veuillez réessayer.";

      toast({
        variant: "destructive",
        title: "Échec de la connexion",
        description: (
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600" />
            <span>{message}</span>
          </div>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0 bg-login-gradient animate-login-gradient opacity-90" />

      {/* Blobs lumineux */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-72 w-72 rounded-full bg-primary/30 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute top-1/2 -right-32 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl animate-blob animation-delay-2000" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl animate-blob animation-delay-4000" />

      {/* Contenu centré */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md shadow-2xl border border-white/20 bg-background/80 backdrop-blur-xl">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <Scale className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold">
              Police Judiciaire
            </CardTitle>
            {/* <p className="text-sm text-muted-foreground">
              Système de Gestion des Événements
            </p> */}
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Adresse e-mail"
                    required
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted"
                    aria-label={
                      showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Bouton connexion */}
              <Button
                type="submit"
                className="w-full mt-2"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>

              {/* <p className="text-xs text-center text-muted-foreground mt-2">
                Accès réservé aux agents habilités de la Police Judiciaire.
              </p> */}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
