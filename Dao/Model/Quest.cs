﻿using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;

namespace Dao.Model
{
    public class Quest : BaseModel
    {
        [Required]
        public virtual string Name { get; set; }

        [Required]
        public virtual string Desc { get; set; }

        [Required]
        [Description("[1.0 = 100%] Эффективность с которой был выполнен квест. При закрытие квеста, умножаем базовую награду на этот коэффицент")]
        public virtual double Effective { get; set; } = 0;

        //[Description("Базовая награда. Меняет статус героя, добавляя ему опыт, деньги, жизни и т.д.")]
        //public virtual Dictionary<CharacteristicType, int> Result { get; set; }

        public virtual Hero Executor { get; set; }

        [Required]
        [Description("Стартовый эвент")]
        public virtual Event RootEvent { get; set; }

        [Description("Список подсказок. Подсказки можно покупать, что бы узнать о том что тебя ждёт")]
        public virtual List<string> Tips { get; set; } = new List<string>();

        //[Description("Подзадача которая сейчас выполняется героем")]
        //public Event CurentEvent { get; set; }

        //[Description("Список уже пройденных подзадача, чьи эффекты были премененны на героя и квест в целом")]
        //public List<Event> History { get; set; } = new List<Event>();

        public virtual List<Event> AllEvents { get; set; }
    }
}

