import { Pressable, Text, StyleSheet, ViewStyle } from "react-native";

type Props = { title: string; onPress?: () => void; style?: ViewStyle };

export default function Button({ title, onPress, style }: Props) {
  return (
    <Pressable onPress={onPress} style={[s.btn, style]}>
      <Text style={s.txt}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  txt: { fontWeight: "600" },
});
