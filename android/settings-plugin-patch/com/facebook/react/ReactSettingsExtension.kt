package com.facebook.react

import org.gradle.api.Action
import org.gradle.api.Project
import org.gradle.api.initialization.Settings
import org.gradle.api.model.ObjectFactory
import java.io.File
import java.io.Serializable
import javax.inject.Inject

open class ReactSettingsExtension @Inject constructor(private val settings: Settings, private val objects: ObjectFactory) {
  private val includeDirs: MutableList<String> = mutableListOf()
  private val excludeDirs: MutableList<String> = mutableListOf()
  
  /**
   * Method that will be used to make the extension work in Groovy builds
   */
  fun root(root: String) {
    this.includeDirs.add(root)
  }

  /**
   * Method that will be used to make the extension work in Groovy builds
   */
  fun exclude(dir: String) {
    this.excludeDirs.add(dir)
  }

  /**
   * Method that will be used to add a list of folders where to look for 3rd party libraries
   * in React Native projects.
   *
   * @param includeDirs A vararg of paths that represents the list of folders with 3rd party
   * libraries
   */
  fun include(vararg includeDirs: String) {
    includeDirs.forEach { dir -> this.includeDirs.add(dir) }
  }

  /**
   * Method that will be used to exclude a list of folders where to look for 3rd party libraries in
   * React Native projects.
   *
   * @param excludeDirs A vararg of paths that represents the list of folders to exclude
   */
  fun exclude(vararg excludeDirs: String) {
    excludeDirs.forEach { dir -> this.excludeDirs.add(dir) }
  }

  /**
   * Method that can be used to obtain the list of includeDirs.
   *
   * @return The list of includeDirs.
   */
  fun getIncludeDirs(): MutableList<String> = includeDirs

  /**
   * Method that can be used to obtain the list of excludeDirs.
   *
   * @return The list of excludeDirs.
   */
  fun getExcludeDirs(): MutableList<String> = excludeDirs

  fun autolinkLibrariesFromCommand(command: List<String>? = null) {
    try {
      val projectRoot = File(settings.rootProject.projectDir.toURI().path)
      if (command != null) {
        settings.extensions.extraProperties["__AUTOLINK_CMD"] = CommandJsonSerializable(command)
      }
      settings.extensions.extraProperties["__AUTOLINK_INCLUDE_DIRS"] = includeDirs
      settings.extensions.extraProperties["__AUTOLINK_EXCLUDE_DIRS"] = excludeDirs
    } catch (e: Exception) {
      // We don't want to crash on Android side if anything goes wrong with autolinking. We'll still
      // print the stacktrace though.
      e.printStackTrace()
    }
  }
}

internal data class CommandJsonSerializable(val command: List<String>) : Serializable 