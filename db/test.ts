import { signUpUser, signInUser, deleteUser } from './userController';


const main = async () => {
  // Example: Sign up a new user
  const signUpResult = await signUpUser(
    'Bzzz Bzz',
    'Bee Biologists',
    'Buzz.co',
    'India',
    'bzbz',
    'bzbz@bz.co',
    'Bz'
  );

  if (signUpResult.success) {
    console.log('User signed up successfully:', signUpResult.user);
  } else {
    console.log('Sign-up failed:', signUpResult.message);
  }

  // Example: Sign in a user (with either username or email)
  const signInResult = await signInUser('bzbz@bz.co', 'Bz');

  if (signInResult.success) {
    console.log('User signed in successfully:', signInResult.user);
  } else {
    console.log('Sign-in failed:', signInResult.message);
  }
};

main().catch(console.error);