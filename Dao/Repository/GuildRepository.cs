﻿using System.Collections.Generic;
using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using Dao.IRepository;
using Dao.Model;

namespace Dao.Repository
{
    public class GuildRepository : BaseRepository<Guild>, IGuildRepository
    {
        public GuildRepository(WriterContext db) : base(db)
        {
        }

        public override Guild Get(long id)
        {
            return Entity.Include(x => x.Location).FirstOrDefault(x => x.Id == id);
        }

        public override List<Guild> GetAll()
        {
            return Entity.ToList();
        }
    }
}