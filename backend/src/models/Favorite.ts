import Database from '../config/database.js';
import type { SongWithDetails } from './Song.js';

export interface Favorite {
  id: number;
  user_id: number;
  song_id: number;
  added_at: string;
}

export class FavoriteModel {
  // Prevent instantiation; static-only container
  private constructor() {}
  static async addToFavorites(
    userId: number,
    songId: number,
  ): Promise<boolean> {
    try {
      const stmt = `INSERT INTO favorites (user_id, song_id) VALUES (?, ?)`;
      await Database.run(stmt, [userId, songId]);
      return true;
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      if (err?.message?.includes('UNIQUE constraint failed')) {
        return true; // Already favorited
      }
      throw error;
    }
  }

  static async removeFromFavorites(
    userId: number,
    songId: number,
  ): Promise<boolean> {
    const stmt = `DELETE FROM favorites WHERE user_id = ? AND song_id = ?`;
    const result = await Database.run(stmt, [userId, songId]);
    return result.changes > 0;
  }

  static async isFavorited(userId: number, songId: number): Promise<boolean> {
    const stmt = `SELECT 1 FROM favorites WHERE user_id = ? AND song_id = ?`;
    const result = await Database.get(stmt, [userId, songId]);
    return !!result;
  }

  static async getUserFavorites(userId: number): Promise<SongWithDetails[]> {
    const stmt = `
        SELECT
          s.*,
          a.name as artist_name,
          al.title as album_title,
          al.artwork_path,
          f.added_at as favorited_at
        FROM favorites f
        JOIN songs s ON f.song_id = s.id
        JOIN artists a ON s.artist_id = a.id
        LEFT JOIN albums al ON s.album_id = al.id
        WHERE f.user_id = ?
        ORDER BY f.added_at DESC
      `;
    const favorites = await Database.query(stmt, [userId]);
    return favorites as SongWithDetails[];
  }

  static async getFavoritesCount(userId: number): Promise<number> {
    const stmt = `SELECT COUNT(*) as count FROM favorites WHERE user_id = ?`;
    const result = (await Database.get(stmt, [userId])) as
      | { count: number }
      | undefined;
    return result?.count || 0;
  }

  static async toggleFavorite(
    userId: number,
    songId: number,
  ): Promise<{ isFavorited: boolean }> {
    const isCurrentlyFavorited = await FavoriteModel.isFavorited(
      userId,
      songId,
    );

    if (isCurrentlyFavorited) {
      await FavoriteModel.removeFromFavorites(userId, songId);
      return { isFavorited: false };
    } else {
      await FavoriteModel.addToFavorites(userId, songId);
      return { isFavorited: true };
    }
  }
}
