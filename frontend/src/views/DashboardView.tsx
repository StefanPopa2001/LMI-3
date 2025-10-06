"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  People as PeopleIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  CalendarToday as CalendarTodayIcon,
  TrendingUp as TrendingUpIcon,
  Replay as ReplayIcon,
  CreditCard as CreditCardIcon,
  Work as WorkIcon,
  Cloud as CloudIcon,
  Science as ScienceIcon,
  Badge as BadgeIcon,
  Groups2 as Groups2Icon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Build as BuildIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
} from '@mui/icons-material'
import { Dashboard as DashboardIcon } from '@mui/icons-material'
import { Container, Typography, Box } from '@mui/material'

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
      icon: <BadgeIcon fontSize="inherit" />,
      route: "/users",
      stats: `${userStats.totalUsers} utilisateurs`,
    },
    {
      title: "Étudiants",
      description: "Gestion des élèves et inscriptions",
      icon: <Groups2Icon fontSize="inherit" />,
      route: "/users/crud",
      stats: "Gestion scolaire",
    },
    {
      title: "Classes",
      description: "Organiser et gérer les classes",
      icon: <SchoolIcon fontSize="inherit" />,
      route: "/classes",
      stats: "Gestion des cours",
    },
  ]

  const toolsCards = [
    {
      title: "Présences",
      description: "Suivre les présences aux cours",
      icon: <CalendarTodayIcon fontSize="inherit" />,
      route: "/attendance",
      stats: "Suivi en temps réel",
    },
    {
      title: "RR",
      description: "Replacements et rattrapages",
      icon: <ReplayIcon fontSize="inherit" />,
      route: "/rr",
      stats: "Tous les RR",
    },
    {
      title: "Logipay",
      description: "Gestion des paiements et facturation",
      icon: <CreditCardIcon fontSize="inherit" />,
      route: "/logipay",
      stats: "Paiements en ligne",
    },
    {
      title: "Drive",
      description: "Fichiers partagés / stockage",
      icon: <CloudIcon fontSize="inherit" />,
      route: "/drive",
      stats: "Stockage",
    },
  ]

  const adminCards = [
    {
      title: "Settings",
      description: "Manage course dropdowns and settings",
      icon: <SettingsIcon fontSize="inherit" />,
      route: "/settings",
      stats: "Configuration",
    },
    {
      title: "Permanence",
      description: "Gestion des permanences et surveillance",
      icon: <WorkIcon fontSize="inherit" />,
      route: "/permanence",
      stats: "Surveillance active",
    },
    {
      title: "Analyses",
      description: "Statistiques et rapports détaillés",
      icon: <TrendingUpIcon fontSize="inherit" />,
      route: "/stats",
      stats: "Données complètes",
    },
    {
      title: "FA & FO",
      description: "Zone de tests (Playground)",
      icon: <ScienceIcon fontSize="inherit" />,
      route: "/fafo",
      stats: "Expérimentations",
    },
  ]

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, var(--color-bg-secondary), var(--color-bg-primary))', mt: 8 }}>
      <NavBar />
      <Container maxWidth="lg" sx={{ py: 4, pt: 2 }}>
        {/* Base de données Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" fontWeight={800} gutterBottom color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <StorageIcon fontSize="large" />
            Base de données
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)'
              }
            }}
          >
            {databaseCards.map((card, index) => (
              <Box key={card.title}>
                <DashboardFeatureCard
                  title={card.title}
                  description={card.description}
                  route={card.route}
                  icon={card.icon}
                  stats={card.stats}
                  index={index}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Outils Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" fontWeight={800} gutterBottom color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BuildIcon fontSize="large" />
            Outils
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)'
              }
            }}
          >
            {toolsCards.map((card, index) => (
              <Box key={card.title}>
                <DashboardFeatureCard
                  title={card.title}
                  description={card.description}
                  route={card.route}
                  icon={card.icon}
                  stats={card.stats}
                  index={index + 3}
                />
              </Box>
            ))}
          </Box>
        </Box>

        {/* Administration Section */}
        <Box>
          <Typography variant="h3" fontWeight={800} gutterBottom color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AdminPanelSettingsIcon fontSize="large" />
            Administration
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 3,
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)'
              }
            }}
          >
            {adminCards.map((card, index) => (
              <Box key={card.title}>
                <DashboardFeatureCard
                  title={card.title}
                  description={card.description}
                  route={card.route}
                  icon={card.icon}
                  stats={card.stats}
                  index={index + 7}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
