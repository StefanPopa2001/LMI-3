"use client"
import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { notifications } from "@mantine/notifications"
import authService from "../services/authService"

// Mantine
import {
  Container,
  Box,
  Paper,
  Title,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Image,
  Stack,
  Group,
  Modal,
  Loader,
  Center,
  Flex,
} from "@mantine/core"
import { 
  IconSchool, 
  IconMail, 
  IconLock, 
  IconKey,
} from '@tabler/icons-react'

export default function LoginView() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    if (authService.isAuthenticated()) {
      router.push("/dashboard")
    }
  }, [router])

  const handleApiError = (err: any) => {
    if (err?.message && String(err.message).startsWith("AUTH_ERROR:")) {
      notifications.show({
        title: 'Session expirée',
        message: 'Veuillez vous reconnecter.',
        color: 'red',
      })
      return
    }
    notifications.show({
      title: 'Erreur',
      message: err?.message ?? String(err),
      color: 'red',
    })
  }

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)

    try {
      const response = await authService.login(email, password)
      if (response?.requirePasswordChange) {
        setShowPasswordChange(true)
      } else {
        notifications.show({
          title: 'Connexion réussie',
          message: 'Bienvenue !',
          color: 'green',
        })
        router.push("/dashboard")
      }
    } catch (err: any) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      notifications.show({
        title: 'Erreur',
        message: 'Les mots de passe ne correspondent pas',
        color: 'red',
      })
      return
    }
    setLoading(true)
    try {
      await authService.changePassword("", newPassword)
      setShowPasswordChange(false)
      notifications.show({
        title: 'Succès',
        message: 'Mot de passe changé avec succès',
        color: 'green',
      })
      router.push("/dashboard")
    } catch (err: any) {
      handleApiError(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* Left side - Image (hidden on mobile) */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
        visibleFrom="md"
      >
        <Image
          src="/lmi3/images/cdd_sketch.png"
          alt="Logiscool Mons Intranet"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.3,
          }}
        />
        <Box
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <IconSchool size={120} color="white" opacity={0.8} />
          <Title order={1} c="white" mt="md">
            LMI III
          </Title>
          <Text c="white" size="xl" mt="xs">
            Logiscool Mons Intranet
          </Text>
        </Box>
      </Box>

      {/* Right side - Login Form */}
      <Flex
        style={{ flex: 1 }}
        direction="column"
        align="center"
        justify="center"
        p="xl"
      >
        <Container size="xs" w="100%">
          <Paper shadow="xl" p="xl" radius="lg" className="animate-scale-in">
            <Stack gap="lg">
              <Center>
                <Image
                  src="/lmi3/images/logo_lmi_iii.png"
                  alt="LMI III Logo"
                  w={200}
                  h={200}
                  fit="contain"
                />
              </Center>

              <Box>
                <Title order={2} ta="center" fw={700}>
                  Bienvenue
                </Title>
                <Text c="dimmed" size="sm" ta="center" mt={5}>
                  Connectez-vous avec le compte fourni par votre administrateur
                </Text>
              </Box>

              <form onSubmit={handleLogin}>
                <Stack gap="md">
                  <TextInput
                    label="Email"
                    placeholder="votre.email@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    leftSection={<IconMail size={18} />}
                    size="md"
                  />

                  <PasswordInput
                    label="Mot de passe"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    leftSection={<IconLock size={18} />}
                    size="md"
                  />

                  <Button
                    type="submit"
                    fullWidth
                    size="md"
                    disabled={loading}
                    leftSection={loading ? <Loader size="xs" color="white" /> : undefined}
                  >
                    {loading ? 'Connexion...' : 'Se connecter'}
                  </Button>
                </Stack>
              </form>

              <Text size="xs" c="dimmed" ta="center">
                Contactez popa.stefan.pro@gmail.com / 048 606 50 45 en cas de problème.
              </Text>
            </Stack>
          </Paper>
        </Container>
      </Flex>

      <Modal
        opened={showPasswordChange}
        onClose={() => setShowPasswordChange(false)}
        title="Changement de mot de passe requis"
        size="md"
        centered
      >
        <Stack gap="md">
          <Paper p="md" withBorder>
            <Group>
              <Box
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'var(--mantine-color-yellow-1)',
                  borderRadius: 'var(--mantine-radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconKey size={24} color="var(--mantine-color-yellow-9)" />
              </Box>
              <Text size="sm" flex={1}>
                Vous devez changer votre mot de passe avant de continuer. Choisissez un mot de passe sécurisé.
              </Text>
            </Group>
          </Paper>

          <PasswordInput
            label="Nouveau mot de passe"
            placeholder="Entrez votre nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            leftSection={<IconLock size={18} />}
            description="Minimum 8 caractères, inclure majuscule, minuscule et chiffre"
          />

          <PasswordInput
            label="Confirmez le nouveau mot de passe"
            placeholder="Confirmez votre mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            leftSection={<IconLock size={18} />}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={() => setShowPasswordChange(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={loading || !newPassword || !confirmPassword}
              leftSection={loading ? <Loader size="xs" /> : undefined}
            >
              {loading ? 'Changement...' : 'Changer le mot de passe'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  )
}
