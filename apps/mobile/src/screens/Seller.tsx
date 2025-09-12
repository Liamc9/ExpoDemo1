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
    const q = query(collection(db, "shops"), where("ownerUid", "==", userUid));
    const unsub = onSnapshot(
      q,
      (s) => {
        const shop = s.docs[0]
          ? ({ id: s.docs[0].id, ...(s.docs[0].data() as any) } as Shop)
          : null;
        setMyShop(shop);
        setLoadingShop(false);

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
          productsUnsubRef.current = onSnapshot(pq, (ps) => {
            setProducts(
              ps.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
              })) as Product[]
            );
            setLoadingProducts(false);
          });
        } else {
          setProducts([]);
          setLoadingProducts(false);
        }
      },
      (err) => {
        console.error("shop snapshot error:", err);
        setLoadingShop(false);
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

    // optional: downsize for faster upload
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
      navigation.navigate("CreateShop");
      return;
    }
    if (!validate() || saving) return;

    try {
      setSaving(true);
      const imageUrl = await uploadImageAndGetUrl(imageUri!, myShop.id);

      await addDoc(collection(db, "products"), {
        shopId: myShop.id,
        name: name.trim(),
        priceCents: priceCents!,
        imageUrl,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ownerUid: myShop.ownerUid,
      });

      // reset
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
      <Ionicons name="chevron-forward" size={18} color="#9FA2A7" />
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

  if (!myShop) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyWrap}>
          <Ionicons name="storefront-outline" size={28} color="#EDEEF1" />
          <Text style={styles.emptyTitle}>You don’t have a shop yet</Text>
          <Text style={styles.emptySub}>
            Create one to start listing products with photos.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("CreateShop")}
            style={styles.cta}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={18} />
            <Text style={styles.ctaText}>Create a shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topbar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>Seller</Text>
          <Text style={styles.title}>{myShop.name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate("Shop", { shopId: myShop.id })}
          style={styles.linkPill}
        >
          <Ionicons name="eye-outline" size={16} />
          <Text style={styles.linkPillText}>View shop</Text>
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
              <Ionicons name="image-outline" size={22} color="#AEB3BA" />
              <Text style={styles.imagePromptText}>Tap to add a photo</Text>
            </View>
          )}
        </TouchableOpacity>
        {errors.image ? <Text>{errors.image}</Text> : null}

        {/* Fields */}
        <View style={{ gap: 10, marginTop: 8 }}>
          <View style={styles.inputWrap}>
            <Ionicons name="pricetag-outline" size={16} color="#9FA2A7" />
            <TextInput
              placeholder="Product name"
              placeholderTextColor="#7a7a7a"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          </View>
          {errors.name ? <Text>{errors.name}</Text> : null}

          <View style={styles.inputWrap}>
            <Ionicons name="cash-outline" size={16} color="#9FA2A7" />
            <Text style={styles.prefix}>£</Text>
            <TextInput
              placeholder="0.00"
              placeholderTextColor="#7a7a7a"
              value={price}
              onChangeText={setPrice}
              keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
              style={styles.input}
            />
          </View>
          {errors.price ? <Text>{errors.price}</Text> : null}

          <TouchableOpacity
            onPress={addProduct}
            disabled={saving}
            activeOpacity={0.9}
            style={[styles.cta, (!imageUri || saving) && { opacity: 0.75 }]}
          >
            {saving ? <ActivityIndicator /> : <Ionicons name="add" size={18} />}
            <Text style={styles.ctaText}>
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
  safe: { flex: 1, backgroundColor: "#0B0B0C" },

  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  overline: { color: "#9FA2A7", fontSize: 12, marginBottom: 2 },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },

  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#15161A",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#23252A",
  },
  linkPillText: { color: "#EDEEF1", fontWeight: "700", fontSize: 12 },

  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#0E0F13",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#20232A",
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
  },

  imagePicker: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#15161A",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#23252A",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imagePromptText: { color: "#AEB3BA" },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#15161A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#23252A",
  },
  input: { flex: 1, color: "#EDEEF1", fontSize: 15 },
  prefix: { color: "#AEB3BA", fontSize: 15, fontWeight: "700" },

  cta: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { fontWeight: "800", fontSize: 14 },

  sectionTitle: {
    color: "#FFFFFF",
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
    backgroundColor: "#0E0F13",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#20232A",
  },
  productImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#1A1B1E",
  },
  productName: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  productMeta: { color: "#9FA2A7", marginTop: 2 },

  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dim: { color: "#9FA2A7" },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  emptyTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  emptySub: { color: "#9FA2A7" },
  emptyMini: { alignItems: "center", paddingVertical: 12 },
});
