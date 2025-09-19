"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  User,
  Settings,
  GraduationCap,
  Calendar,
  TrendingUp,
  RotateCcw,
  CreditCard,
  Briefcase,
  Cloud,
  Beaker
} from "lucide-react"

import DashboardFeatureCard from "../ui/organisms/DashboardFeatureCard"
import NavBar from "../components/layout/NavBar"

interface UserStats {
  totalUsers: number
  activeUsers: number
  adminUsers: number
  tempPasswordUsers: number
}

export default function DashboardView() {
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    tempPasswordUsers: 0,
  })

  // Helper function to handle API errors
  const handleApiError = (err: any) => {
    if (err.message && err.message.startsWith("AUTH_ERROR:")) {
      router.push("/login")
      return
    }
    console.error("API Error:", err.message)
  }

  useEffect(() => {
    fetchUserStats()
  }, [])

  const fetchUserStats = async () => {
    try {
      // Note: Keeping the original auth logic intact as requested
      // if (authService.isAuthenticated()) {
      //   const stats = await authService.getUserStats();
      //   setUserStats(stats);
      // }
    } catch (error: any) {
      handleApiError(error)
    }
  }

  const databaseCards = [
    {
      title: "Utilisateurs",
      description: "Gérer les utilisateurs du système",
      icon: <Users />,
      route: "/users",
      stats: `${userStats.totalUsers} utilisateurs`,
    },
    {
      title: "Étudiants",
      description: "Gestion des élèves et inscriptions",
      icon: <User />,
      route: "/users/crud",
      stats: "Gestion scolaire",
    },
    {
      title: "Classes",
      description: "Organiser et gérer les classes",
      icon: <GraduationCap />,
      route: "/classes",
      stats: "Gestion des cours",
    },
  ]

  const toolsCards = [
    {
      title: "Présences",
      description: "Suivre les présences aux cours",
      icon: <Calendar />,
      route: "/attendance",
      stats: "Suivi en temps réel",
    },
    {
      title: "RR",
      description: "Replacements et rattrapages",
      icon: <RotateCcw />,
      route: "/rr",
      stats: "Tous les RR",
    },
    {
      title: "Logipay",
      description: "Gestion des paiements et facturation",
      icon: <CreditCard />,
      route: "/logipay",
      stats: "Paiements en ligne",
    },
    {
      title: "Drive",
      description: "Fichiers partagés / stockage",
      icon: <Cloud />,
      route: "/drive",
      stats: "Stockage",
    },
  ]

  const adminCards = [
    {
      title: "Permanence",
      description: "Gestion des permanences et surveillance",
      icon: <Briefcase />,
      route: "/permanence",
      stats: "Surveillance active",
    },
    {
      title: "Analyses",
      description: "Statistiques et rapports détaillés",
      icon: <TrendingUp />,
      route: "/stats",
      stats: "Données complètes",
    },
    {
      title: "Paramètres",
      description: "Configuration du système",
      icon: <Settings />,
      route: "/settings",
      stats: "Personnalisation",
    },
    {
      title: "FA & FO",
      description: "Zone de tests (Playground)",
      icon: <Beaker />,
      route: "/fafo",
      stats: "Expérimentations",
    },
  ]

  return (
    <div 
      className="min-h-screen"
      style={{ background: 'linear-gradient(to bottom right, var(--color-bg-secondary), var(--color-bg-primary))' }}
    >
      <NavBar />

      {/* Main Dashboard Sections */}
      <div className="max-w-7xl mx-auto px-6 py-8 pt-20 space-y-12">
        {/* Base de données Section */}
        <div>
          <h2 className="text-4xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
            Base de données
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {databaseCards.map((card, index) => (
              <DashboardFeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                route={card.route}
                icon={card.icon}
                stats={card.stats}
                index={index}
              />
            ))}
          </div>
        </div>

        {/* Outils Section */}
        <div>
          <h2 className="text-4xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
            Outils
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {toolsCards.map((card, index) => (
              <DashboardFeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                route={card.route}
                icon={card.icon}
                stats={card.stats}
                index={index + 3} // Offset index for color variety
              />
            ))}
          </div>
        </div>

        {/* Administration Section */}
        <div>
          <h2 className="text-4xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
            Administration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {adminCards.map((card, index) => (
              <DashboardFeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                route={card.route}
                icon={card.icon}
                stats={card.stats}
                index={index + 7} // Offset index for color variety
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
