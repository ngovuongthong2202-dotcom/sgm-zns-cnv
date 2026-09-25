import { BaseRepository } from './base.repo';

export const repositoryFactory = {
  get<T>(collectionName: string): BaseRepository<T> {
    return new BaseRepository<T>(collectionName);
  }
};
