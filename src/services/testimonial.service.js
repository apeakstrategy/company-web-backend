const { db } = require("../config/firebase");

const COLLECTION = "testimonials";

exports.createTestimonial = async (data) => {
  data.createdAt = new Date();
  await db.collection(COLLECTION).add(data);
};

exports.getAllTestimonials = async () => {
  const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

exports.getTestimonialById = async (id) => {
  const doc = await db.collection(COLLECTION).doc(id).get();
  return { id: doc.id, ...doc.data() };
};

exports.updateTestimonial = async (id, data) => {
  await db.collection(COLLECTION).doc(id).update(data);
};

exports.deleteTestimonial = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};
