const { db } = require("../config/firebase");

const COLLECTION = "portfolio";

exports.createPortfolio = async (data) => {
  data.createdAt = new Date();
  await db.collection(COLLECTION).add(data);
};

exports.getAllPortfolio = async () => {
  const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

exports.getPortfolioById = async (id) => {
  const doc = await db.collection(COLLECTION).doc(id).get();
  return { id: doc.id, ...doc.data() };
};

exports.updatePortfolio = async (id, data) => {
  await db.collection(COLLECTION).doc(id).update(data);
};

exports.deletePortfolio = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};
