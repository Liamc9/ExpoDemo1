import { useEffect, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { auth, db } from "../firebase-config";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import type { Product, Shop } from "../types";
import { onAuthStateChanged } from "firebase/auth";

const storage = getStorage();

// Accent used across the UI
const ACCENT = "#2ecc71";

export default function Seller({ navigation }: any) {
  const [userUid, setUserUid] = useState<string | null>(
    auth.currentUser?.uid ?? null
  );
  const [myShop, setMyShop] = useState<Shop | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [name, setName] = useState("");
  const [price, setPrice] = useState(""); // "12.50"
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    price?: string;
    image?: string;
  }>({});

  const productsUnsubRef = useRef<Unsubscribe | null>(null);

  // track auth
  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setUserUid(u?.uid ?? null));
    return () => off();
  }, []);

  // subscribe shop + products
  useEffect(() => {
    if (!userUid) {
      setLoadingShop(false);
      return;
    }
    const qShops = query(
      collection(db, "shops"),
      where("ownerUid", "==", userUid)
    );
    const unsub = onSnapshot(
      qShops,
      (s) => {
        const shop = s.docs[0]
          ? ({ id: s.docs[0].id, ...(s.docs[0].data() as any) } as Shop)
          : null;
        setMyShop(shop);
        setLoadingShop(false);

        // reset product subscription
        if (productsUnsubRef.current) {
          productsUnsubRef.current();
          productsUnsubRef.current = null;
        }

        if (shop?.id) {
          const pq = query(
            collection(db, "products"),
            where("shopId", "==", shop.id),
            orderBy("createdAt", "desc")
          );
          setLoadingProducts(true);
          productsUnsubRef.current = onSnapshot(
            pq,
            (ps) => {
              setProducts(
                ps.docs.map((d) => ({
                  id: d.id,
                  ...(d.data() as any),
                })) as Product[]
              );
              setLoadingProducts(false);
            },
            (err) => {
              console.error("products snapshot error:", err);
              setLoadingProducts(false);
              Alert.alert(
                "Products error",
                "We couldn't load your products. If Firestore asks for an index, create it from the console link and try again."
              );
            }
          );
        } else {
          setProducts([]);
          setLoadingProducts(false);
        }
      },
      (err) => {
        console.error("shop snapshot error:", err);
        setLoadingShop(false);
        Alert.alert("Shop error", "We couldn't load your shop.");
      }
    );
    return () => {
      unsub();
      if (productsUnsubRef.current) productsUnsubRef.current();
    };
  }, [userUid]);

  // helpers
  const validate = () => {
    const e: { name?: string; price?: string; image?: string } = {};
    if (!name.trim()) e.name = "Enter a product name.";
    const p = Number((price || "").replace(",", "."));
    if (!price.trim() || isNaN(p) || p <= 0) e.price = "Enter a valid price.";
    if (!imageUri) e.image = "Please add a photo.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const priceCents = useMemo(() => {
    const p = Number((price || "").replace(",", "."));
    return isNaN(p) ? null : Math.round(p * 100);
  }, [price]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to upload a picture."
      );
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (res.canceled) return;

    // downsize for faster upload
    const asset = res.assets[0];
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    setImageUri(manipulated.uri);
  };

  const uriToBlob = async (uri: string) => {
    const r = await fetch(uri);
    return await r.blob();
  };

  const uploadImageAndGetUrl = async (localUri: string, shopId: string) => {
    const blob = await uriToBlob(localUri);
    const fileName = `${Date.now()}.jpg`;
    const storageRef = ref(storage, `shops/${shopId}/products/${fileName}`);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    return url;
  };

  const addProduct = async () => {
    if (!myShop) {
      Alert.alert("No shop found", "Create your shop first.");
      navigation.navigate("CreateShopDetails");
      return;
    }
    if (!validate() || saving) return;

    try {
      setSaving(true);
      const imageUrl = await uploadImageAndGetUrl(imageUri!, myShop.id);

      await addDoc(collection(db, "products"), {
        shopId: myShop.id,
        ownerUid: myShop.ownerUid,
        name: name.trim(),
        priceCents: priceCents!, // already validated
        imageUrl,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // reset form
      setName("");
      setPrice("");
      setImageUri(null);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Could not add product", err?.message ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const ProductCard = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <Image
        source={{
          uri:
            (item as any).imageUrl ||
            "https://via.placeholder.com/160x120?text=No+Image",
        }}
        style={styles.productImage}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productMeta}>
          £{((item.priceCents ?? 0) / 100).toFixed(2)} •{" "}
          {item.isActive ? "Active" : "Inactive"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#98A2B3" />
    </View>
  );

  if (loadingShop) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerFill}>
          <ActivityIndicator />
          <Text style={styles.dim}>Loading your shop…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Minimal, modern "no shop yet" state ----------
  if (!myShop) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyCardMinimal}>
          <View style={styles.iconCircle}>
            <Ionicons name="storefront-outline" size={28} color="#0B1220" />
          </View>

          <Text style={styles.emptyTitleBig}>Create your shop</Text>
          <Text style={styles.emptySubBig}>
            Set a name and cover image to start listing products.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Create my shop"
            onPress={() => navigation.navigate("CreateShopDetails")}
            style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={18} color="#0B1220" />
            <Text style={styles.primaryBtnText}>Create shop</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "How it works",
                "You’ll add a name and cover image now, then list products with photos and prices. You can edit everything later."
              )
            }
            style={styles.textLink}
            activeOpacity={0.8}
          >
            <Text style={styles.textLinkLabel}>
              What will I need? <Ionicons name="chevron-forward" size={12} />
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomHint}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#6B7280" />
          <Text style={styles.bottomHintText}>
            You can change your shop details anytime.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------- Shop exists ----------
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topbarRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>Seller</Text>
          <Text style={styles.titleLg}>{myShop.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Shop", { shopId: myShop.id })}
          style={styles.linkPill}
          activeOpacity={0.9}
        >
          <Ionicons name="eye-outline" size={16} color={ACCENT} />
          <Text style={[styles.linkPillText, { color: ACCENT }]}>View</Text>
        </TouchableOpacity>
      </View>

      {/* Add product card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add a product</Text>

        {/* Image picker */}
        <TouchableOpacity
          onPress={pickImage}
          style={styles.imagePicker}
          activeOpacity={0.9}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.imagePrompt}>
              <Ionicons name="image-outline" size={22} color="#98A2B3" />
              <Text style={styles.imagePromptText}>Tap to add a photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {errors.image ? (
          <Text style={styles.errorText}>{errors.image}</Text>
        ) : null}

        {/* Fields */}
        <View style={{ gap: 10, marginTop: 8 }}>
          <View style={styles.inputWrap}>
            <Ionicons name="pricetag-outline" size={16} color="#98A2B3" />
            <TextInput
              placeholder="Product name"
              placeholderTextColor="#98A2B3"
              value={name}
              onChangeText={setName}
              style={styles.input}
              accessibilityLabel="Product name"
            />
          </View>
          {errors.name ? (
            <Text style={styles.errorText}>{errors.name}</Text>
          ) : null}

          <View style={styles.inputWrap}>
            <Ionicons name="cash-outline" size={16} color="#98A2B3" />
            <Text style={styles.prefix}>£</Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor="#98A2B3"
              value={price}
              onChangeText={setPrice}
              keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
              style={styles.input}
              accessibilityLabel="Price"
            />
          </View>
          {errors.price ? (
            <Text style={styles.errorText}>{errors.price}</Text>
          ) : null}

          <TouchableOpacity
            onPress={addProduct}
            disabled={saving}
            activeOpacity={0.9}
            style={[
              styles.cta,
              { backgroundColor: ACCENT },
              (!imageUri || saving) && { opacity: 0.75 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Ionicons name="add" size={18} color="#111" />
            )}
            <Text style={[styles.ctaText, { color: "#111" }]}>
              {saving ? "Adding…" : "Add product"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Products list */}
      <Text style={styles.sectionTitle}>Your products</Text>
      {loadingProducts ? (
        <View style={styles.centerFill}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          renderItem={ProductCard}
          ListEmptyComponent={
            <View style={styles.emptyMini}>
              <Text style={styles.dim}>
                No products yet—add your first above.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFC" },

  // Top bars
  topbar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  topbarRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },

  overline: {
    color: "#6B7280",
    fontSize: 12,
    marginBottom: 2,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: { color: "#0B1220", fontSize: 18, fontWeight: "800" },
  titleLg: { color: "#0B1220", fontSize: 22, fontWeight: "800" },

  // Minimal Empty State
  emptyCardMinimal: {
    marginHorizontal: 16,
    marginVertical: "auto",
    paddingVertical: 28,
    paddingHorizontal: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  emptyTitleBig: {
    color: "#0B1220",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySubBig: {
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 6,
  },
  primaryBtn: {
    marginTop: 8,
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#0B1220", fontSize: 15, fontWeight: "800" },
  textLink: { paddingVertical: 6, paddingHorizontal: 8 },
  textLinkLabel: { color: "#0B1220", fontWeight: "700" },

  // Bottom hint
  bottomHint: {
    marginHorizontal: 16,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bottomHintText: { color: "#6B7280", flex: 1, fontSize: 12 },

  // Existing shop UI
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#000000ff",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#000000ff",
  },
  linkPillText: { fontWeight: "700", fontSize: 12 },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    color: "#0B1220",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  imagePicker: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imagePromptText: { color: "#98A2B3" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
  },
  input: { flex: 1, color: "#0B1220", fontSize: 15 },
  prefix: { color: "#6B7280", fontSize: 15, fontWeight: "700" },

  cta: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { fontWeight: "800", fontSize: 14 },

  sectionTitle: {
    color: "#0B1220",
    fontSize: 16,
    fontWeight: "800",
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  productCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  productImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  productName: { color: "#0B1220", fontSize: 15, fontWeight: "700" },
  productMeta: { color: "#6B7280", marginTop: 2 },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dim: { color: "#98A2B3" },
  emptyMini: { alignItems: "center", paddingVertical: 12 },
  errorText: { color: "#DC2626", fontSize: 12, marginTop: 6 },
});
