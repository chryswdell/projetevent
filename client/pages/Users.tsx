import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { userService, UserDto } from "@/services/userService";
import { authService } from "@/services/authService";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  Plus,
  Trash2,
  XCircle,
  Shield,
  Edit2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire partagé (création / édition)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Protection: seulement admin
  useEffect(() => {
    const current = authService.getCurrentUser();

    if (!current) {
      navigate("/login");
      return;
    }

    if (!(current as any).is_admin) {
      toast({
        variant: "destructive",
        title: "Accès refusé",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <span>Vous n&apos;avez pas accès à ce menu.</span>
          </div>
        ),
      });
      navigate("/dashboard");
    }
  }, [navigate, toast]);

  // Charger la liste des utilisateurs
  useEffect(() => {
    const load = async () => {
      try {
        const data = await userService.list();
        setUsers(data);
      } catch (err) {
        console.error("Erreur lors du chargement des utilisateurs", err);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: (
            <div className="flex items-center gap-2">
              <XCircle className="text-red-600 w-5 h-5" />
              <span>Impossible de charger les utilisateurs.</span>
            </div>
          ),
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setIsAdmin(false);
    setEditingUser(null);
    setShowPassword(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (user: UserDto) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setIsAdmin(!!user.is_admin);
    setShowPassword(false);
    setDialogOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        const updated = await userService.update(editingUser.id, {
          name,
          email,
          password: password || undefined,
          is_admin: isAdmin,
        });

        setUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u))
        );

        toast({
          title: "Utilisateur modifié",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-blue-600 w-5 h-5" />
              <span>L&apos;utilisateur a été modifié avec succès.</span>
            </div>
          ),
        });
      } else {
        const newUser = await userService.create({
          name,
          email,
          password,
          is_admin: isAdmin,
        });

        setUsers((prev) => [...prev, newUser]);

        toast({
          title: "Utilisateur créé",
          description: (
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-600 w-5 h-5" />
              <span>L&apos;utilisateur a été créé avec succès.</span>
            </div>
          ),
        });
      }

      resetForm();
      setDialogOpen(false);
    } catch (err: any) {
      console.error(
        "Erreur lors de l'enregistrement de l'utilisateur",
        err
      );

      const message =
        err?.response?.data?.message ||
        "Une erreur est survenue lors de l'enregistrement.";

      toast({
        variant: "destructive",
        title: "Erreur",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <span>{message}</span>
          </div>
        ),
      });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet utilisateur ?")) {
      return;
    }

    try {
      await userService.remove(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));

      toast({
        title: "Utilisateur supprimé",
        description: (
          <div className="flex items-center gap-2">
            <Trash2 className="text-red-600 w-5 h-5" />
            <span>L&apos;utilisateur a été supprimé avec succès.</span>
          </div>
        ),
      });
    } catch (err) {
      console.error("Erreur lors de la suppression", err);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: (
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600 w-5 h-5" />
            <span>Impossible de supprimer cet utilisateur.</span>
          </div>
        ),
      });
    }
  };

  const dialogTitle = editingUser
    ? "Modifier l'utilisateur"
    : "Créer un nouvel utilisateur";

  return (
    <Layout title="Gestion des utilisateurs">
      {/* En-tête de la page + bouton d'ajout */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Utilisateurs</h3>
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Tableau */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Aucun utilisateur enregistré.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.is_admin ? (
                        <span className="inline-flex items-center gap-1 text-sm text-purple-700 font-medium">
                          <Shield className="w-4 h-4" />
                          Administrateur
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Utilisateur
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("fr-FR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(user)}
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog création / édition */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmitUser}>
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe{" "}
                {editingUser && (
                  <span className="text-xs text-muted-foreground">
                    (laisser vide pour ne pas changer)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editingUser}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
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

            <div className="flex items-center gap-2">
              <input
                id="is_admin"
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="is_admin">Administrateur</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setDialogOpen(false);
                }}
              >
                Annuler
              </Button>
              <Button type="submit">
                {editingUser ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
