﻿using System.Collections.Generic;
using System.Security.Cryptography.X509Certificates;
using Dao.Model;

namespace Dao.IRepository
{
    public interface IQuestRepository : IBaseRepository<Quest>
    {
        List<Quest> GetAllWithRootEvent();

        Quest GetByName(string name);
    }
}