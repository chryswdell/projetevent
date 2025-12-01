import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold text-primary">404</h1>
            <h2 className="text-2xl font-semibold">Page non trouvée</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              La page que vous recherchez n'existe pas. Veuillez retourner à la
              page d'accueil.
            </p>
          </div>

          <Link to="/">
            <Button className="gap-2 mt-6">
              <Home className="w-4 h-4" />
              Retourner à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
