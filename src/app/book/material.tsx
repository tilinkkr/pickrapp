import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BookingLayout } from '@/components/booking/booking-layout';
import { AmountPicker } from '@/components/booking/amount-picker';
import { EmptyState } from '@/components/trips/empty-state';
import { Check, Info, Search } from '@/components/ui/icons';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';
import { PressableScale } from '@/components/ui/pressable-scale';
import { makeStyles, useBrand } from '@/lib/app-theme';
import { useBooking } from '@/lib/booking';
import { CATEGORIES, type CategoryId, getCategory, getItem, pick, searchItems } from '@/lib/catalog';
import { choiceHaptic } from '@/lib/haptics';
import { useSession } from '@/lib/session';

const COLUMNS = 3;

/** Step 1 of 5 (handoff C03): what is moving and how much. Search, category chips, picture grid. */
export default function MaterialStep() {
  const Brand = useBrand();
  const styles = useStyles();
  const { category: categoryParam } = useLocalSearchParams<{ category?: string }>();
  const { t, language } = useSession();
  const { draft, start, chooseItem, setQuantity } = useBooking();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>(
    getCategory(categoryParam)?.id ?? draft.category ?? 'all'
  );

  // Opened from a Home tile with nothing chosen yet: start a fresh draft on that category.
  useEffect(() => {
    const fromHome = getCategory(categoryParam);
    if (fromHome && draft.category !== fromHome.id && !draft.itemId) start({ category: fromHome.id });
  }, [categoryParam, draft.category, draft.itemId, start]);

  const item = getItem(draft.itemId);
  const results = searchItems(query, language).filter((i) => query || category === 'all' || i.category === category);
  // Rows of three equal cells (flex: 1), padded with empty cells, so every row meets both page edges.
  const rows = Array.from({ length: Math.ceil(results.length / COLUMNS) }, (_, r) => results.slice(r * COLUMNS, r * COLUMNS + COLUMNS));

  return (
    <BookingLayout
      title={t('bookDispatch')}
      step={1}
      footer={
        item ? (
          <AmountPicker
            key={item.id}
            measure={item.measure}
            value={draft.quantity}
            title={t('howMuch', { material: pick(item.name, language) })}
            onChange={setQuantity}
            onDone={() => router.push('/book/route')}
          />
        ) : undefined
      }>
      <Text style={styles.h1} accessibilityRole="header">
        {t('whatMoving')}
      </Text>
      <Text style={styles.sub}>{t('whatMovingSub')}</Text>

      <View style={styles.search}>
        <Search size={20} color={Brand.muted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchMaterials')}
          placeholderTextColor="#A39B94"
          accessibilityLabel={t('searchMaterials')}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {!query && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(['all', ...CATEGORIES.map((c) => c.id)] as const).map((id) => {
            const selected = category === id;
            const label = id === 'all' ? t('filterAll') : pick(getCategory(id)!.title, language);
            return (
              <Pressable
                key={id}
                onPress={() => {
                  choiceHaptic();
                  setCategory(id);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}>
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {results.length === 0 ? (
        <EmptyState icon={Search} title={t('noMaterialMatch')} body={t('noMaterialMatchSub')} />
      ) : (
        <View style={styles.grid} accessibilityRole="radiogroup">
          {rows.map((row, r) => (
            <View key={r} style={styles.row}>
              {row.map((i) => {
                const selected = i.id === draft.itemId;
                return (
                  <PressableScale
                    key={i.id}
                    onPress={() => {
                      choiceHaptic();
                      chooseItem(i.id);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={pick(i.name, language)}
                    style={[styles.tile, selected && styles.tileSelected]}>
                    <ImagePlaceholder
                      source={i.image}
                      tint={i.tint}
                      icon={getCategory(i.category)!.icon}
                      iconSize={26}
                      style={styles.tileImage}
                    />
                    <Text style={styles.tileName} numberOfLines={2}>
                      {pick(i.name, language)}
                    </Text>
                    {selected && (
                      <Animated.View entering={FadeIn.duration(150)} style={styles.check}>
                        <Check size={14} color={Brand.onPrimary} strokeWidth={3} />
                      </Animated.View>
                    )}
                  </PressableScale>
                );
              })}
              {Array.from({ length: COLUMNS - row.length }, (_, k) => (
                <View key={`gap-${k}`} style={[styles.tile, styles.filler]} />
              ))}
            </View>
          ))}
        </View>
      )}

      {item?.transitPass && (
        <View style={styles.notice}>
          <Info size={18} color={Brand.warning} strokeWidth={2} />
          <Text style={styles.noticeText}>{t('transitPassShort')}</Text>
        </View>
      )}
    </BookingLayout>
  );
}

const useStyles = makeStyles((Brand) => ({
  h1: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '700',
    color: Brand.text,
  },
  sub: {
    marginTop: 4,
    fontSize: 15,
    color: Brand.muted,
  },
  search: {
    marginTop: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.surface,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Brand.text,
    outlineWidth: 0,
  },
  chips: {
    gap: 8,
    paddingVertical: 14,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.border,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: Brand.onPrimary,
    backgroundColor: Brand.onPrimary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: Brand.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  grid: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  // An invisible tile (same padding and border) so a short last row keeps the grid's column widths.
  filler: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  tile: {
    flex: 1,
    padding: 6,
    paddingBottom: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: Brand.card,
    gap: 8,
  },
  tileSelected: {
    borderWidth: 2.5,
    borderColor: Brand.primary,
    backgroundColor: Brand.selected,
  },
  tileImage: {
    width: '100%',
    // Catalogue photos are 4:3; the frame matches, so nothing is cropped away.
    aspectRatio: 4 / 3,
    borderRadius: 11,
  },
  tileName: {
    paddingHorizontal: 4,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: Brand.text,
  },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: Brand.warningFill,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#9A3412',
  },
}));
