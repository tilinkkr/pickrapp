import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { ProfilePage } from '@/components/profile/settings';
import { EmptyState } from '@/components/trips/empty-state';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Bookmark, Plus } from '@/components/ui/icons';
import { MIcon, type MIconName } from '@/components/ui/m-icon';
import { PrimaryButton } from '@/components/ui/primary-button';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { selectionHaptic, successHaptic } from '@/lib/haptics';
import { STAGGER_MS } from '@/lib/motion';
import { useSession } from '@/lib/session';
import { type SavedSite, useSites } from '@/lib/sites';

type Editing = { mode: 'add' } | { mode: 'edit'; site: SavedSite };

/**
 * Favourite sites (C23 saved sites): pinned first, then most booked. Add a
 * site with the + button, tap a site to rename it or fix its address, and
 * delete it from the same sheet after a confirmation.
 */
export default function FavouritesScreen() {
  const Brand = useBrand();
  const styles = useStyles();
  const { t } = useSession();
  const { favourites, togglePin, addSite, editSite, removeSite } = useSites();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const valid = address.trim().length >= 6;

  function open(next: Editing, deleting = false) {
    selectionHaptic();
    setName(next.mode === 'edit' ? next.site.name ?? '' : '');
    setAddress(next.mode === 'edit' ? next.site.label : '');
    setConfirmDelete(deleting);
    setEditing(next);
  }

  function save() {
    if (!editing || !valid) return;
    successHaptic();
    const patch = { name: name.trim() || undefined, label: address.trim() };
    if (editing.mode === 'add') addSite(patch);
    else editSite(editing.site.id, patch);
    setEditing(null);
  }

  function remove() {
    if (editing?.mode !== 'edit') return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    removeSite(editing.site.id);
    setEditing(null);
  }

  return (
    <ProfilePage title={t('favourites')} action={{ icon: Plus, label: t('addSite'), onPress: () => open({ mode: 'add' }) }}>
      <Text style={styles.hint}>{t('favouritesHint')}</Text>

      {favourites.length === 0 ? (
        <View>
          <EmptyState icon={Bookmark} title={t('noFavourites')} />
          <PrimaryButton label={t('addSite')} icon={Plus} onPress={() => open({ mode: 'add' })} />
        </View>
      ) : (
        <View style={styles.list}>
          {favourites.map((site, i) => (
            <Animated.View
              key={site.id}
              layout={LinearTransition.duration(220)}
              entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic)).delay(i * STAGGER_MS)}
              exiting={FadeOut.duration(160)}
              style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.icon, site.pinned && styles.iconPinned]}>
                  <MIcon name="map-marker" size={20} color={site.pinned ? Brand.onPrimary : Brand.link} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name} numberOfLines={1}>
                    {site.name ?? site.label.split(',')[0]}
                  </Text>
                  <Text style={styles.address} numberOfLines={2}>
                    {site.label}
                  </Text>
                </View>
              </View>
              {/* Every action is a visible button: pin, edit, move on the map, delete. */}
              <View style={styles.actions}>
                <Action
                  icon={site.pinned ? 'pin' : 'pin-outline'}
                  label={site.pinned ? t('unpinSite') : t('pinSite')}
                  on={site.pinned}
                  onPress={() => {
                    selectionHaptic();
                    togglePin(site.id);
                  }}
                />
                <Action icon="pencil-outline" label={t('edit')} onPress={() => open({ mode: 'edit', site })} />
                <Action
                  icon="map-search-outline"
                  label={t('mapWord')}
                  onPress={() => router.push({ pathname: '/book/map', params: { purpose: 'favourite', siteId: site.id } })}
                />
                <Action icon="trash-can-outline" label={t('deleteWord')} danger onPress={() => open({ mode: 'edit', site }, true)} />
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      <BottomSheet
        visible={editing !== null}
        title={editing?.mode === 'edit' ? t('editSite') : t('addSite')}
        closeLabel={t('close')}
        onClose={() => setEditing(null)}>
        <View style={styles.form}>
          <Text style={styles.label}>{t('siteName')}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('siteNamePlaceholder')}
            placeholderTextColor={Brand.muted}
            maxLength={30}
            style={styles.input}
          />
          <Text style={styles.label}>{t('siteAddress')}</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={t('siteAddressPlaceholder')}
            placeholderTextColor={Brand.muted}
            multiline
            maxLength={160}
            style={[styles.input, styles.inputTall]}
          />
          {editing?.mode === 'add' && (
            <Pressable
              onPress={() => {
                setEditing(null);
                router.push({ pathname: '/book/map', params: { purpose: 'favourite' } });
              }}
              accessibilityRole="button"
              style={styles.mapPick}>
              <MIcon name="map-search-outline" size={20} color={Brand.link} />
              <Text style={styles.mapPickText}>{t('chooseOnMap')}</Text>
            </Pressable>
          )}
          <PrimaryButton label={t('save')} disabled={!valid} onPress={save} />
          {editing?.mode === 'edit' && (
            <Pressable onPress={remove} accessibilityRole="button" style={[styles.delete, confirmDelete && styles.deleteConfirm]}>
              <MIcon name="trash-can-outline" size={20} color={Brand.danger} />
              <Text style={styles.deleteText}>{confirmDelete ? t('deleteSiteConfirm') : t('deleteSite')}</Text>
            </Pressable>
          )}
        </View>
      </BottomSheet>
    </ProfilePage>
  );
}

function Action({ icon, label, on, danger, onPress }: { icon: MIconName; label: string; on?: boolean; danger?: boolean; onPress: () => void }) {
  const Brand = useBrand();
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
      <MIcon name={icon} size={18} color={danger ? Brand.danger : on ? Brand.link : Brand.text} />
      <Text style={[styles.actionText, danger && styles.actionDanger, on && styles.actionOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles((Brand) => ({
  flex: {
    flex: 1,
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
    color: Brand.muted,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  action: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionPressed: {
    backgroundColor: Brand.border,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Brand.text,
  },
  actionOn: {
    color: Brand.link,
  },
  actionDanger: {
    color: Brand.danger,
  },
  mapPick: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  mapPickText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.link,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Brand.selected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPinned: {
    backgroundColor: Brand.primary,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Brand.text,
  },
  address: {
    marginTop: 2,
    fontSize: 13,
    color: Brand.muted,
  },
  pin: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: 8,
  },
  label: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: Brand.text,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Brand.surface,
    fontSize: 16,
    color: Brand.text,
    outlineWidth: 0,
  },
  inputTall: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  delete: {
    marginTop: 4,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
  },
  deleteConfirm: {
    backgroundColor: Brand.dangerFill,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '800',
    color: Brand.danger,
  },
}));
