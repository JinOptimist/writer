﻿using System;
using System.Linq;
using System.Threading;
using NUnit.Framework;
using OpenQA.Selenium;

namespace WebWriterV2Test
{
    [TestFixture]
    public class QuestTest
    {
        public static string rpgBaseUrl = Properties.Settings.Default.BaseAppUrl;

        public static Random random = new Random();

        [Test]
        public void QuestThrough()
        {
            TestRunner.RunTest(CheckAllQuests, TargetBrowser.ChromePlusIe);
        }

        private void CheckAllQuests(IWebDriver driver)
        {
            driver.Navigate().GoToUrl(rpgBaseUrl);
            driver.Manage().Timeouts().ImplicitlyWait(TimeSpan.FromSeconds(5));
            driver.Manage().Window.Maximize();

            var questBlockIds = driver.FindElements(By.ClassName("quest-block"))
                .Select(x => x.GetAttribute("id")).ToList();

            Assert.Greater(questBlockIds.Count, 0, "Not found any quest. I supouse it's bad signs");

            questBlockIds.ForEach(x => CheckQuest(driver, x));

            driver.Quit();
        }

        private void CheckQuest(IWebDriver driver, string questId)
        {
            driver.Navigate().GoToUrl(rpgBaseUrl);
            driver.Manage().Timeouts().ImplicitlyWait(TimeSpan.FromSeconds(5));

            Thread.Sleep(500);
            var quest = driver.FindElement(By.Id(questId));

            Assert.IsNotNull(quest, $"Somebody try check quest which does not exist. questId - {questId}");
            Assert.IsTrue(quest.Displayed, $"I can't see quest {questId}. There is exist, but not visible for user");

            quest.Click();

            var counter = 0;
            driver.Manage().Timeouts().ImplicitlyWait(TimeSpan.FromSeconds(1));
            var liTags = driver.FindElements(By.CssSelector("li.wayLink"));
            while (liTags.Count > 0)
            {
                //Thread.Sleep(100);
                var wayNumber = random.Next(liTags.Count);
                liTags[wayNumber].Click();
                liTags = driver.FindElements(By.CssSelector("li.wayLink"));
                counter++;
                if (counter > 100)
                {
                    Assert.Warn($"Posible infinity loop. We did {counter} choes and stil can't find exit. qId - {questId}");
                    return;
                }
            }

            var endButton = driver.FindElement(By.Id("end"));
            Assert.IsNotNull(endButton, $"List of ways empty and we haven't end button. qId - {questId}");
            Assert.IsTrue(endButton.Displayed, $"List of ways empty and we have, but doesn't see end button. qId - {questId}");
            endButton.Click();
        }
    }
}
