﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Dao.Model;
using WebWriterV2.RpgUtility;

namespace WebWriterV2.FrontModels
{
    public class FrontHero : BaseFront
    {
        public FrontHero()
        {
        }

        public FrontHero(Hero hero)
        {
            Id = hero.Id;
            Name = hero.Name;
            Background = hero.Background;
            Race = new FronEnum(hero.Race);
            Sex = new FronEnum(hero.Sex);

            Characteristics = new List<FronEnumPlusValue>();
            foreach (var characteristic in hero.Characteristics)
            {
                var frontEnum = new FronEnum(characteristic.CharacteristicType);
                Characteristics.Add(new FronEnumPlusValue(frontEnum, characteristic.Number));
            }

            State = new List<FronEnumPlusValue>();
            foreach (var state in hero.State)
            {
                var fronEnum = new FronEnum(state.StateType);
                State.Add(new FronEnumPlusValue(fronEnum, state.Number));
            }

            Skills = hero.Skills.Select(x => new FrontSkill(x)).ToList();
        }

        public string Name { get; set; }
        public string Background { get; set; }
        public FronEnum Race { get; set; }
        public FronEnum Sex { get; set; }

        public List<FronEnumPlusValue> Characteristics { get; set; }
        public List<FronEnumPlusValue> State { get; set; }

        public List<FrontSkill> Skills { get; set; }
    }
}