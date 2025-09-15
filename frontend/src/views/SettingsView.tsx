'use client';

import React, { useState, useEffect } from 'react';
import { settingsService, Setting, GroupedSettings, CreateSettingData } from '../services/settingsService';
import NavBar from '../components/layout/NavBar';
import { useToast } from '../components/ui/ToastManager';

interface SettingsViewProps {
  className?: string;
}

const categoryLabels: Record<string, string> = {
  level: 'Niveaux de cours',
  typeCours: 'Types de cours', 
  location: 'Emplacements',
  salle: 'Salles'
};

const categoryDescriptions: Record<string, string> = {
  level: 'Gérez les différents niveaux de difficulté des cours',
  typeCours: 'Définissez les types de cours disponibles',
  location: 'Configurez les différents emplacements des cours',
  salle: 'Gérez les salles disponibles pour les cours'
};

export default function SettingsView({ className = '' }: SettingsViewProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [settings, setSettings] = useState<GroupedSettings>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('level');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSetting, setEditingSetting] = useState<Setting | null>(null);
  const [formData, setFormData] = useState<CreateSettingData>({
    category: 'level',
    value: '',
    label: '',
    description: '',
    order: 0
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      showError(null);
      const data = await settingsService.getAllSettings();
      setSettings(data);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await settingsService.createSetting(formData);
      await loadSettings();
      setIsCreateModalOpen(false);
      setFormData({
        category: activeCategory,
        value: '',
        label: '',
        description: '',
        order: 0
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleUpdateSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSetting) return;
    
    try {
      await settingsService.updateSetting(editingSetting.id, {
        value: formData.value,
        label: formData.label,
        description: formData.description,
        order: formData.order
      });
      await loadSettings();
      setEditingSetting(null);
      setFormData({
        category: activeCategory,
        value: '',
        label: '',
        description: '',
        order: 0
      });
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteSetting = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce paramètre ?')) return;
    
    try {
      await settingsService.deleteSetting(id);
      await loadSettings();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  const handleInitializeSettings = async () => {
    if (!confirm('Êtes-vous sûr de vouloir initialiser les paramètres par défaut ? Cela ajoutera des valeurs par défaut pour toutes les catégories.')) return;
    
    try {
      await settingsService.initializeSettings();
      await loadSettings();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erreur lors de l\'initialisation');
    }
  };

  const openCreateModal = () => {
    setFormData({
      category: activeCategory,
      value: '',
      label: '',
      description: '',
      order: 0
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (setting: Setting) => {
    setFormData({
      category: setting.category,
      value: setting.value,
      label: setting.label || '',
      description: setting.description || '',
      order: setting.order || 0
    });
    setEditingSetting(setting);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setEditingSetting(null);
    setFormData({
      category: activeCategory,
      value: '',
      label: '',
      description: '',
      order: 0
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <NavBar />
        <div className="flex justify-center p-8">
          <div style={{ color: 'var(--color-text-primary)' }} className="font-semibold">Chargement des paramètres...</div>
        </div>
      </div>
    );
  }

  const currentSettings = settings[activeCategory] || [];

  return (
    <div className={`min-h-screen ${className}`} style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <NavBar />
      <div className="p-6"> 
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Paramètres des cours</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Gérez les options disponibles pour les classes et les cours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-lg shadow-lg" style={{ 
            backgroundColor: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border-light)' 
          }}>
            <div className="p-4" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Catégories</h2>
            </div>
            <nav className="p-2">
              {Object.keys(categoryLabels).map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className="w-full text-left px-3 py-2 rounded mb-1 transition-all duration-200"
                  style={{
                    color: 'var(--color-text-primary)',
                    backgroundColor: activeCategory === category ? 'var(--color-primary-500)' : 'transparent',
                    fontWeight: activeCategory === category ? '600' : 'normal'
                  }}
                  onMouseEnter={(e) => {
                    if (activeCategory !== category) {
                      (e.target as HTMLElement).style.backgroundColor = 'var(--color-bg-tertiary)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeCategory !== category) {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {categoryLabels[category]}
                  {settings[category] && (
                    <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium" style={{ 
                      backgroundColor: 'var(--color-bg-tertiary)', 
                      color: 'var(--color-text-primary)' 
                    }}>
                      {settings[category].length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Settings content */}
        <div className="lg:col-span-3">
          <div className="rounded-lg shadow-lg" style={{ 
            backgroundColor: 'var(--color-bg-secondary)', 
            border: '1px solid var(--color-border-light)' 
          }}>
            <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <div>
                <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{categoryLabels[activeCategory]}</h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{categoryDescriptions[activeCategory]}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInitializeSettings}
                  className="px-4 py-2 rounded font-semibold transition-all duration-200"
                  style={{ 
                    backgroundColor: 'var(--color-warning-500)', 
                    color: 'var(--color-text-primary)' 
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-warning-600)'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-warning-500)'}
                >
                  Initialiser
                </button>
                <button
                  onClick={openCreateModal}
                  className="px-4 py-2 rounded font-semibold transition-all duration-200"
                  style={{ 
                    backgroundColor: 'var(--color-primary-500)', 
                    color: 'var(--color-text-primary)' 
                  }}
                  onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-primary-600)'}
                  onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'var(--color-primary-500)'}
                >
                  Ajouter
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {currentSettings.length === 0 ? (
                <p className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
                  Aucun paramètre configuré pour cette catégorie.
                </p>
              ) : (
                <div className="space-y-3">
                  {currentSettings.map((setting) => (
                    <div key={setting.id} className="border rounded-lg p-4" style={{ 
                      borderColor: 'var(--color-border-light)',
                      backgroundColor: 'var(--color-bg-secondary)'
                    }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{setting.label || setting.value}</span>
                            <span className="px-2 py-1 rounded text-xs font-medium" style={{
                              backgroundColor: 'var(--color-bg-tertiary)',
                              color: 'var(--color-text-primary)'
                            }}>
                              {setting.value}
                            </span>
                            {setting.order !== null && (
                              <span className="px-2 py-1 rounded text-xs font-medium" style={{
                                backgroundColor: 'var(--color-primary-500)',
                                color: 'var(--color-text-primary)'
                              }}>
                                Ordre: {setting.order}
                              </span>
                            )}
                          </div>
                          {setting.description && (
                            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{setting.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => openEditModal(setting)}
                            className="text-sm font-medium transition-colors hover:opacity-80"
                            style={{ color: 'var(--color-primary-500)' }}
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteSetting(setting.id)}
                            className="text-sm font-medium transition-colors hover:opacity-80"
                            style={{ color: 'var(--color-error-500)' }}
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingSetting) && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="rounded-lg p-6 w-full max-w-md border" style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border-light)'
          }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              {editingSetting ? 'Modifier le paramètre' : 'Ajouter un paramètre'}
            </h3>
            
            <form onSubmit={editingSetting ? handleUpdateSetting : handleCreateSetting}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)'
                    }}
                    disabled={!!editingSetting}
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value} style={{
                        backgroundColor: 'var(--color-bg-secondary)',
                        color: 'var(--color-text-primary)'
                      }}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Valeur *</label>
                  <input
                    type="text"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)'
                    }}
                    required
                    placeholder="ex: beginner, advanced, salle-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Libellé</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)'
                    }}
                    placeholder="ex: Débutant, Avancé, Salle 1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)'
                    }}
                    rows={2}
                    placeholder="Description optionnelle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Ordre d'affichage</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded px-3 py-2"
                    style={{
                      borderColor: 'var(--color-border-light)',
                      backgroundColor: 'var(--color-bg-primary)',
                      color: 'var(--color-text-primary)'
                    }}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModals}
                  className="px-4 py-2 border rounded hover:opacity-80"
                  style={{
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border-light)',
                    backgroundColor: 'transparent'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--color-primary-500)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  {editingSetting ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
