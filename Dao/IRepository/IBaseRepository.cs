﻿using System.Collections.Generic;
using Dao.Model;

namespace Dao.IRepository
{
    public interface IBaseRepository<T>
    {
        bool Exist(T baseModel);

        void Save(T baseModel);

        void Save(List<T> baseModels);

        List<T> GetAll();

        T Get(long id);

        List<T> GetList(IEnumerable<long> ids);

        void Remove(long id);

        void Remove(T baseModel);

        void Remove(List<T> models);
    }
}