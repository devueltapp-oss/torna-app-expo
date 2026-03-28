import auth from '@react-native-firebase/auth';

export function registerUserWithEmailAndPassword(
  email: string,
  password: string,
) {
  return auth().createUserWithEmailAndPassword(email, password);
}

export function logInUserWithEmailAndPassword(email: string, password: string) {
  return auth().signInWithEmailAndPassword(email, password);
}

export function logOut() {
  return auth().signOut();
}

export function sendPasswordResetEmail(email: string) {
  return auth().sendPasswordResetEmail(email);
}

export function deleteCurrentUser() {
  const user = auth().currentUser;

  return user?.delete();
}
