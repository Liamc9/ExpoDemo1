import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase-config";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

const PRICE_BANDS = ["£", "££", "£££"];
const CATEGORIES = ["Bakery", "Coffee", "Meals", "Desserts", "Crafts"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export default function CreateShop({ navigation }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [priceBand, setPriceBand] = useState<"£" | "££" | "£££" | "">("££");
  const [eta, setEta] = useState("20–30 min");
  const [categories, setCategories] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // auto-generate slug from name if user hasn't edited slug manually
  const autoSlug = useMemo(() => slugify(name), [name]);
  useEffect(() => {
    // only sync if slug matches the previous auto value (user didn’t type their own)
    if (!slug || slug === slugify(slug)) setSlug(autoSlug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSlug]);

  const toggleCategory = (c: string) =>
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const validate = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Please enter a shop name.";
    const s = slugify(slug);
    if (!s) e.slug = "Please enter a valid slug.";
    if (s !== slug) setSlug(s); // normalize
    // slug uniqueness check
    if (s) {
      const snap = await getDocs(
        query(collection(db, "shops"), where("slug", "==", s))
      );
      if (!snap.empty) e.slug = "This slug is already taken.";
    }
    if (coverUrl && !/^https?:\/\//i.test(coverUrl))
      e.coverUrl = "Enter a valid URL (https://...)";
    if (!priceBand) e.priceBand = "Select a price band.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const create = async () => {
    if (!auth.currentUser?.uid) {
      Alert.alert("Sign in required", "Please sign in to create a shop.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);

    try {
      const ok = await validate();
      if (!ok) {
        setSubmitting(false);
        return;
      }

      const ownerUid = auth.currentUser.uid;
      const payload = {
        ownerUid,
        name: name.trim(),
        slug: slug.trim(),
        status: "active" as const,
        tagline: tagline.trim() || "Homemade & local",
        description: description.trim(),
        coverUrl:
          coverUrl.trim() ||
          "https://images.unsplash.com/photo-1542831371-d531d36971e6?q=80&w=1200&auto=format&fit=crop",
        categories,
        priceBand, // "£" | "££" | "£££"
        eta: eta.trim() || "20–30 min",
        rating: 5.0,
        ratingCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "shops"), payload);
      navigation.replace("Shop", { shopId: docRef.id });
    } catch (err: any) {
      console.error(err);
      Alert.alert("Could not create shop", err?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "#0B0B0C" }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.topbar}>
          <Text style={styles.title}>Open your shop</Text>
          <Text style={styles.subtitle}>Add details customers will see.</Text>
        </View>

        {/* Name */}
        <Field label="Shop name" error={errors.name}>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="John's Bread"
          />
        </Field>

        {/* Slug */}
        <Field
          label="Slug"
          hint="Used in your URL and search"
          error={errors.slug}
        >
          <Input
            value={slug}
            autoCapitalize="none"
            onChangeText={(t: string) => setSlug(slugify(t))}
            placeholder="johns-bread"
          />
        </Field>

        {/* Tagline */}
        <Field label="Short tagline" hint="A quick one-liner under your name">
          <Input
            value={tagline}
            onChangeText={setTagline}
            placeholder="Freshly baked every morning"
          />
        </Field>

        {/* Description */}
        <Field label="Description" hint="Tell people what you make">
          <Input
            value={description}
            onChangeText={setDescription}
            placeholder="Sourdough loaves, pastries, and coffee."
            multiline
            style={{ minHeight: 96, textAlignVertical: "top" }}
          />
        </Field>

        {/* Cover image URL */}
        <Field label="Cover image URL" error={errors.coverUrl}>
          <Input
            value={coverUrl}
            onChangeText={setCoverUrl}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
          />
        </Field>

        {/* Categories */}
        <Field label="Categories">
          <View style={styles.chipsRow}>
            {CATEGORIES.map((c) => {
              const active = categories.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleCategory(c)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Field>

        {/* ETA & Price band */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Estimated time">
              <Input
                value={eta}
                onChangeText={setEta}
                placeholder="20–30 min"
              />
            </Field>
          </View>
          <View style={{ width: 120 }}>
            <Field label="Price">
              <View style={styles.segment}>
                {PRICE_BANDS.map((p) => {
                  const active = priceBand === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.segmentBtn,
                        active && styles.segmentBtnActive,
                      ]}
                      onPress={() => setPriceBand(p as any)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={create}
          disabled={submitting}
          style={[styles.cta, submitting && { opacity: 0.7 }]}
          activeOpacity={0.9}
        >
          {submitting ? (
            <>
              <ActivityIndicator />
              <Text style={styles.ctaText}>Creating…</Text>
            </>
          ) : (
            <>
              <Ionicons name="storefront-outline" size={18} />
              <Text style={styles.ctaText}>Create shop</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer hint */}
        <Text style={styles.footerHint}>
          You can edit these details later. Slugs must be unique.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------- Small UI helpers ---------- */

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ color: "#EDEEF1", fontWeight: "700" }}>{label}</Text>
        {hint ? (
          <Text style={{ color: "#8D9096", fontSize: 12 }}>{hint}</Text>
        ) : null}
      </View>
      {children}
      {error ? (
        <Text style={{ color: "#ff7a7a", fontSize: 12, marginTop: 6 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Input(props: any) {
  return (
    <View style={styles.inputWrap}>
      <TextInput
        placeholderTextColor="#7a7a7a"
        style={styles.input}
        {...props}
      />
    </View>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 4,
  },
  topbar: { marginBottom: 8 },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  subtitle: { color: "#A0A4AB", marginTop: 2 },

  inputWrap: {
    backgroundColor: "#15161A",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#23252A",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: { color: "#EDEEF1", fontSize: 15 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#15161A",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#26282E",
  },
  chipActive: { backgroundColor: "#2A2D34", borderColor: "#3B3F47" },
  chipText: { color: "#AEB3BA", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#FFFFFF" },

  segment: {
    flexDirection: "row",
    backgroundColor: "#15161A",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#23252A",
    overflow: "hidden",
  },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: "center" },
  segmentBtnActive: { backgroundColor: "#2A2D34" },
  segmentText: { color: "#AEB3BA", fontSize: 13, fontWeight: "700" },
  segmentTextActive: { color: "#FFFFFF" },

  cta: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaText: { fontWeight: "800", fontSize: 16 },

  footerHint: {
    color: "#8D9096",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
});
