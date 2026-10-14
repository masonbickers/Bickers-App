import { AppText as Text } from "../../components/ui/AppPrimitives";
import { collection, doc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { useEffect } from "react";
import {
  View,
} from "react-native";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../providers/AuthProvider";
import PageShell from "../../components/layout/PageShell";

// simple function to generate random 4-digit code
const generateCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export default function FixEmployeesPage() {
  const { employee, isAuthed, loading } = useAuth();
  const companyId = String(employee?.companyId || "").trim();
  useEffect(() => {
    const runFix = async () => {
      if (loading || !isAuthed || !companyId) return;

      const snap = await getDocs(query(collection(db, "employees"), where("companyId", "==", companyId)));
      for (const emp of snap.docs) {
        const empData = emp.data();

        // ✅ only add code if not already set
        if (!empData.userCode) {
          const code = generateCode();
          await updateDoc(doc(db, "employees", emp.id), {
            userCode: code,
          });
        }
      }

    };

    runFix();
  }, [companyId, isAuthed, loading]);

  return (
    <PageShell mode="static">
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Assigning employee codes…</Text>
      </View>
    </PageShell>
  );
}
