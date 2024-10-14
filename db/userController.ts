import { query } from './dbconnect';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Constants for JWT
const accessSecret = process.env.JWT_ACCESS_SECRET as string;
const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
const accessExpiry = process.env.ACCESS_TOKEN_EXPIRY as string;
const refreshExpiry = process.env.REFRESH_TOKEN_EXPIRY as string;

// Create a new user
export const createUser = async (
  name: string,
  occupation: string,
  organization: string,
  country: string,
  username: string,
  email: string,
  password: string
) => { 
  const text = `
    INSERT INTO users (name, occupation, organization, country, username, email, password, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *;
  `;
  const values = [name, occupation, organization, country, username, email, password];
  const result = await query(text, values);
  return result.rows[0]; // Return the created user
};

// Read (Get) user information by ID
export const getUserById = async (id: string) => {
  const text = `SELECT * FROM users WHERE id = $1`;
  const values = [id];
  const result = await query(text, values);
  return result.rows[0]; // Return the user if found
};

// Update user information
export const updateUser = async (
  id: string,
  name?: string,
  occupation?: string,
  organization?: string,
  country?: string,
  username?: string,
  email?: string,
  password?: string
) => {
  const text = `
    UPDATE users 
    SET 
      name = COALESCE($2, name), 
      occupation = COALESCE($3, occupation), 
      organization = COALESCE($4, organization),
      country = COALESCE($5, country),
      username = COALESCE($6, username),
      email = COALESCE($7, email),
      password = COALESCE($8, password),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const values = [id, name, occupation, organization, country, username, email, password];
  const result = await query(text, values);
  return result.rows[0]; // Return the updated user
};

// Delete user by ID
export const deleteUser = async (id: string) => {
  const text = `DELETE FROM users WHERE id = '$1' RETURNING *`;
  const values = [id];
  const result = await query(text, values);
  console.log("deleted USER")
  return result.rows[0]; // Return the deleted user (if any)

};

// Utility function to hash passwords
const hashPassword = async (password: string) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Utility function to compare passwords
const comparePassword = async (enteredPassword: string, storedPassword: string) => {
  return await bcrypt.compare(enteredPassword, storedPassword);
};

// Utility function to generate JWT
const generateTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, accessSecret, { expiresIn: accessExpiry });
  const refreshToken = jwt.sign({ id: userId }, refreshSecret, { expiresIn: refreshExpiry });
  return { accessToken, refreshToken };
};

// 1. Sign-up a new user
export const signUpUser = async (
  name: string,
  occupation: string,
  organization: string,
  country: string,
  username: string,
  email: string,
  password: string
) => {
  try {
    const hashedPassword = await hashPassword(password);
    const text = `
      INSERT INTO users (name, occupation, organization, country, username, email, password, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, name, occupation, organization, country, username, email, created_at, updated_at;
    `;
    const values = [name, occupation, organization, country, username, email, hashedPassword];
    const result = await query(text, values);

    return {
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    };
  } catch (error: any) {
    if (error.code === '23505') {
      return {
        success: false,
        message: 'Username or email already exists'
      };
    } else {
      throw error;
    }
  }
};

// 2. Sign-in a user (using either username or email, and password)
// 2. Sign-in a user (using either username or email, and password)
export const signInUser = async (identifier: string, password: string) => {
  console.log("signing in:");
  console.log(identifier);
  console.log(password);
  
  try {
    const text = `
      SELECT id, name, occupation, organization, country, username, email, password, created_at, updated_at 
      FROM users 
      WHERE email = $1 OR username = $2;
    `;
    const values = [identifier, identifier];
    const result = await query(text, values);
    
    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    const user = result.rows[0];
    console.log(user.id)
    const isPasswordCorrect = await comparePassword(password, user.password);
    if (!isPasswordCorrect) {
      return {
        success: false,
        message: 'Incorrect password'
      };
    }
    
    console.log("Password is correct");

    delete user.password;

    const { accessToken, refreshToken } = generateTokens(user.id);

    // Check for existing refresh tokens and revoke them
    try {
      const revokedTokens = await query(`
        UPDATE refresh_tokens 
        SET revoked = TRUE 
        WHERE user_id = $1 AND revoked = FALSE
        RETURNING id;
      `, [user.id]);

      console.log("Revoked tokens count:", revokedTokens.rows.length);
      
      if (revokedTokens.rows.length === 0) {
        console.log("No active refresh tokens found to revoke for user:", user.id);
      } else {
        console.log("Revoked token ID:", revokedTokens.rows[0].id);
      }
    } catch (error) {
      console.error("Error revoking tokens:", error);
    }

    // Store new refresh token in the database
    try {
      const newTokens = await query(`
        INSERT INTO refresh_tokens (token, user_id, expires_at, created_at, revoked) 
        VALUES ($1, $2, NOW() + INTERVAL '${refreshExpiry}', NOW(), $3)
        RETURNING *;`, 
        [refreshToken, user.id, false]);
      
      
      console.log("New tokens stored:", newTokens);
    } catch (error) {
      console.error("Error storing new tokens:", error);
    }
    

    return {
      success: true,
      message: 'Sign-in successful',
      user,
      tokens: { accessToken, refreshToken }
    };
  } catch (error) {
    throw error;
  }
};



// 3. Refresh access token
export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const decoded = jwt.verify(refreshToken, refreshSecret) as { id: string };

    const accessToken = jwt.sign({ id: decoded.id }, accessSecret, { expiresIn: accessExpiry });

    return {
      success: true,
      accessToken
    };
  } catch (error) {
    return {
      success: false,
      message: 'Invalid refresh token'
    };
  }
};

// 4. Logout user (revoke refresh token)
export const logoutUser = async (refreshToken: string) => {
  console.log("trying to log out: " + refreshToken)
  const text = `
    UPDATE refresh_tokens 
    SET revoked = TRUE 
    WHERE token = $1 
    RETURNING *;
  `;
  const values = [refreshToken];
  const result = await query(text, values);
  return result.rows[0]; // Return the revoked token (if any)
};
