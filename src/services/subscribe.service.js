const { db } = require("../config/firebase");

const COLLECTION = "subscribers";

exports.subscribe = async (email) => {
  const exists = await db
    .collection(COLLECTION)
    .where("email", "==", email)
    .get();

  if (!exists.empty) return;

  await db.collection(COLLECTION).add({
    email,
    createdAt: new Date(),
  });
};

exports.getSubscribers = async () => {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

exports.unsubscribe = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};
