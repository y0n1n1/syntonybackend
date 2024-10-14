import { Router, Request, Response } from 'express';
import {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  signUpUser,
  signInUser,
  refreshAccessToken,
  logoutUser
} from './userController'; // Adjust path as needed

const router = Router();

// Route to create a new user
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { name, occupation, organization, country, username, email, password } = req.body;
    const user = await createUser(name, occupation, organization, country, username, email, password);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// Route to get user information by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await getUserById(id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user' });
  }
});

// Route to update user information
router.put('/update', async (req: Request, res: Response) => {
  try {
    const { id, name, occupation, organization, country, username, email, password } = req.body;
    const updatedUser = await updateUser(id, name, occupation, organization, country, username, email, password);
    if (updatedUser) {
      res.status(200).json(updatedUser);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error updating user' });
  }
});

// Route to delete a user by ID
router.post('/delete', async (req: Request, res: Response) => {
  console.log("DELETE CALLED")
  try {
    const deletedUser = await deleteUser(req.body.id);
    if (deletedUser) {
      console.log("user deleted:"+ deletedUser)
      res.status(200).json({ message: 'User deleted', user: deletedUser });
    } else {
      res.status(404).json({ error: 'User not found' });
      console.log("User not found: "+ deletedUser)
    }
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' });
    console.log("Error deleting user: "+ req.body.id)
  }
});

// Route for user sign-up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, occupation, organization, country, username, email, password } = req.body;
    const result = await signUpUser(name, occupation, organization, country, username, email, password);
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: 'Error signing up user' });
  }
});

// Route for user sign-in
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const result = await signInUser(identifier, password);

    if (result.success) {
      return res.status(200).json({
        message: result.message,
        user: result.user,
        tokens: result.tokens // Include tokens in response
      });
    } else {
      return res.status(result.message === 'User not found' ? 404 : 401).json({ message: result.message });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error signing in user' });
  }
});

// Route for refreshing access token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body; // Get refresh token from request body
    const result = await refreshAccessToken(refreshToken);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(401).json({ message: result.message }); // Invalid refresh token
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error refreshing access token' });
  }
});

// Route for user logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body; // Get refresh token from request body
    const deletedToken = await logoutUser(refreshToken);

    if (deletedToken) {
      return res.status(200).json({ message: 'Logged out successfully' });
    } else {
      return res.status(404).json({ message: 'Refresh token not found' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Error logging out' });
  }
});

export { router as userRouter };
