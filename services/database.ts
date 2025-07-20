

import { supabase } from './supabase';
import type { Profile, Investment } from '../types';

/**
 * Fetches the item IDs from the current user's watchlist.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of item IDs.
 */
export const fetchUserWatchlist = async (userId: string): Promise<number[]> => {
    const { data, error } = await supabase
        .from('watchlists')
        .select('item_id')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching watchlist:', error);
        throw error;
    }
    // `data` can be null if no records are found, so we handle that case.
    return data ? data.map(item => item.item_id) : [];
};

/**
 * Adds a new item to the user's watchlist in the database.
 * @param userId The ID of the user.
 * @param itemId The ID of the item to add.
 * @returns A promise that resolves when the operation is complete.
 */
export const addToWatchlist = async (userId: string, itemId: number) => {
    const { error } = await supabase
        .from('watchlists')
        .insert({ user_id: userId, item_id: itemId });

    if (error) {
        console.error('Error adding to watchlist:', error);
        throw error;
    }
};

/**
 * Removes an item from the user's watchlist in the database.
 * @param userId The ID of the user.
 * @param itemId The ID of the item to remove.
 * @returns A promise that resolves when the operation is complete.
 */
export const removeFromWatchlist = async (userId: string, itemId: number) => {
    const { error } = await supabase
        .from('watchlists')
        .delete()
        .match({ user_id: userId, item_id: itemId });

    if (error) {
        console.error('Error removing from watchlist:', error);
        throw error;
    }
};

/**
 * Fetches a user's profile data by their user ID.
 * @param userId The ID of the user.
 * @returns A promise that resolves to the user's profile or null if not found.
 */
export const getProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // "PGRST116" is the code for "exact one row expected" which means no profile was found.
    // We don't want to throw an error in that case, just return null.
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data;
};


/**
 * Fetches a user's profile and their watchlist by their unique username.
 * This is done in two steps to avoid type issues with relational queries.
 * @param username The username of the user.
 * @returns A promise that resolves to the user's profile with watchlist data, or null if not found.
 */
export const getProfileByUsername = async (username: string): Promise<Profile | null> => {
    // Step 1: Fetch the profile data.
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .eq('username', username)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') return null; // User not found, which is not an error here.
      console.error(`Error fetching profile for ${username}:`, profileError);
      throw profileError;
    }

    if (!profileData) {
        return null;
    }

    // Step 2: Fetch the user's watchlist.
    const { data: watchlistData, error: watchlistError } = await supabase
      .from('watchlists')
      .select('item_id')
      .eq('user_id', profileData.id);
      
    if (watchlistError) {
        console.error(`Error fetching watchlist for ${username}:`, watchlistError);
        // Return profile data even if watchlist fails to load.
        return { ...profileData, watchlists: [] };
    }

    // Step 3: Combine profile and watchlist data.
    const fullProfile: Profile = {
      ...profileData,
      watchlists: watchlistData || [],
    };

    return fullProfile;
};


/**
 * Updates a user's profile data, such as their username.
 * @param userId The ID of the user.
 * @param updates An object containing the profile fields to update.
 * @returns A promise that resolves when the operation is complete.
 */
export const updateProfile = async (userId: string, updates: { username: string }) => {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      // "23505" is the PostgreSQL error code for a unique constraint violation.
      if (error.code === '23505') {
        throw new Error('This username is already taken. Please choose another one.');
      }
      throw error;
    }
};

/**
 * Fetches all investments for a user.
 * @param userId The ID of the user.
 * @returns A promise that resolves to an array of investments.
 */
export const fetchUserInvestments = async (userId: string): Promise<Investment[]> => {
    const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false });

    if (error) {
        console.error('Error fetching investments:', error);
        throw error;
    }
    return data || [];
};

/**
 * Adds a new investment to the database.
 * @param investmentData The investment data to insert.
 * @returns A promise that resolves to the newly created investment.
 */
export const addInvestment = async (investmentData: Omit<Investment, 'id' | 'created_at'> & { created_at?: string }): Promise<Investment> => {
    const { data, error } = await supabase
        .from('investments')
        .insert(investmentData)
        .select()
        .single(); // Return the newly created row

    if (error) {
        console.error('Error adding investment:', error);
        throw error;
    }
    if (!data) {
        throw new Error('Failed to add investment: No data returned from insert.');
    }
    return data;
};

/**
 * Updates an investment to mark it as "sold".
 * @param investmentId The ID of the investment to update.
 * @param sellData The sell price, sell date, and tax paid.
 * @returns A promise that resolves to the updated investment.
 */
export const closeInvestment = async (investmentId: string, sellData: { sell_price: number; sell_date: string; tax_paid: number; }): Promise<Investment> => {
    const { data, error } = await supabase
        .from('investments')
        .update(sellData)
        .eq('id', investmentId)
        .select()
        .single(); // Return the updated row

    if (error) {
        console.error('Error closing investment:', error);
        throw error;
    }
    if (!data) {
        throw new Error('Failed to close investment: No data returned from update.');
    }
    return data;
};

/**
 * Deletes a single investment record from the database.
 * This is an irreversible action.
 * @param investmentId The UUID of the investment to delete.
 */
export const deleteInvestment = async (investmentId: string): Promise<void> => {
    const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId)
        .select()
        .single();

    if (error) {
        console.error('Error deleting investment:', error);
        throw error;
    }
};

/**
 * Deletes all investment records for a specific user.
 * This is an irreversible action.
 * @param userId The ID of the user whose portfolio will be cleared.
 */
export const clearUserInvestments = async (userId: string): Promise<void> => {
    const { error } = await supabase
        .from('investments')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('Error clearing investments:', error);
        throw error;
    }
};