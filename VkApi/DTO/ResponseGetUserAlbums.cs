﻿// Decompiled with JetBrains decompiler
// Type: CopyVk.DTO.ResponseGetUserAlbums
// Assembly: CopyVk, Version=1.0.0.0, Culture=neutral, PublicKeyToken=null
// MVID: CF56976C-8F05-4DD8-92E3-E0666A14F803
// Assembly location: D:\Copy VK\CopyVk.exe

using System.Runtime.Serialization;

namespace VkApi.DTO
{
  [DataContract]
  public class ResponseGetUserAlbums
  {
    [DataMember(Name = "response")]
    public VkAlbum[] Albums { get; set; }
  }
}
