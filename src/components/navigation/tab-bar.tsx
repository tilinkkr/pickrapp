import { BlurView } from "expo-blur";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FileText,
  Home,
  type LucideIcon,
  Truck,
  User,
} from "@/components/ui/icons";
import { makeStyles, useAppTheme, useBrand } from "@/lib/app-theme";
import { choiceHaptic } from "@/lib/haptics";
import { CURVE, DURATION } from "@/lib/motion";

/** Height of the floating bar; tab screens pad their content by this plus the bottom gap. */
export const TAB_BAR_HEIGHT = 56;
export const TAB_BAR_GAP = 12;
const MAX_WIDTH = 340;
const PAD = 5;
/** Opacity steps of the fade above the solid strip behind the bar. */
const FADE = [0.25, 0.5, 0.75, 0.9];
/** The pill slides across like any on-screen move: Base standard curve, no spring, so it never wobbles at the end. */
const GLIDE = { duration: DURATION.page, easing: CURVE.standard };

const ICONS: Record<string, LucideIcon> = {
  index: Home,
  "my-loads": Truck,
  requests: FileText,
  profile: User,
};

/**
 * Compact floating glass pill: the page shows through a blur (iOS/web; a
 * translucent fill on Android, where blur is off by default). Small icons,
 * one-word labels; an orange-tinted pill glides under the active tab.
 */
export function TabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const Brand = useBrand();
  const styles = useStyles();
  const { dark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const slot = width > 0 ? (width - PAD * 2) / count : 0;
  const x = useSharedValue(0);

  // The first measurement places the pill without a slide; tab changes glide.
  const placedAt = useSharedValue(0);
  useEffect(() => {
    if (slot <= 0) return;
    if (placedAt.get() !== slot) {
      placedAt.set(slot);
      x.set(state.index * slot);
    } else {
      x.set(withTiming(state.index * slot, GLIDE));
    }
  }, [state.index, slot, x, placedAt]);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <>
      {/* Page content fades out behind the bar instead of showing through it. */}
      <View
        pointerEvents="none"
        style={[
          styles.backdrop,
          { height: insets.bottom + TAB_BAR_GAP + TAB_BAR_HEIGHT / 2 },
        ]}
      >
        {FADE.map((alpha) => (
          <View
            key={alpha}
            style={[
              styles.fadeBand,
              { backgroundColor: dimAlpha(Brand.card, alpha) },
            ]}
          />
        ))}
        <View style={[styles.flex, { backgroundColor: Brand.card }]} />
      </View>
      <View
        pointerEvents="box-none"
        style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_GAP }]}
      >
        <View
          role="tablist"
          style={styles.bar}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          <BlurView
            intensity={60}
            tint={dark ? "dark" : "light"}
            style={styles.glass}
          />
          {slot > 0 && (
            <Animated.View style={[styles.pill, { width: slot }, pillStyle]} />
          )}
          {state.routes.map((route, index) => {
            const focused = index === state.index;
            const label = descriptors[route.key].options.title ?? route.name;
            const Icon = ICONS[route.name] ?? Home;
            return (
              <Pressable
                key={route.key}
                role="tab"
                aria-selected={focused}
                accessibilityLabel={label}
                onPress={() => {
                  const event = emitter.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    choiceHaptic();
                    navigateToTab(route.key);
                  }
                }}
                style={styles.tab}
              >
                <Icon
                  size={20}
                  color={focused ? Brand.link : Brand.muted}
                  strokeWidth={focused ? 2.25 : 1.5}
                  fill={focused ? Brand.primary : "none"}
                  fillOpacity={focused ? 0.25 : 0}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.label, focused && styles.labelActive]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
  );
}

const useStyles = makeStyles((Brand) => ({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  bar: {
    width: "100%",
    maxWidth: MAX_WIDTH,
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    padding: PAD,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: Brand.border,
    backgroundColor: dimAlpha(Brand.card, 0.94),
    overflow: "hidden",
    shadowColor: "#7C2D12",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  fadeBand: {
    height: 6,
  },
  flex: {
    flex: 1,
  },
  glass: {
    ...StyleSheet.absoluteFill,
  },
  pill: {
    position: "absolute",
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: (TAB_BAR_HEIGHT - PAD * 2) / 2,
    backgroundColor: Brand.selected,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: Brand.muted,
  },
  labelActive: {
    fontWeight: "800",
    color: Brand.link,
  },
}));

/** '#RRGGBB' plus alpha, for the see-through glass fill. */
function dimAlpha(hex: string, alpha: number) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;
}
